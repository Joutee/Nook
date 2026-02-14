import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { supabase } from "../utils/supabase";
import { useToast } from "../contexts/ToastContext";
import { useFlatContext } from "../contexts/FlatContext";
import { Ionicons } from "@expo/vector-icons";
import DocumentViewerModal from "../components/DocumentViewerModal";
const isDeletedRef = useRef(false);

interface Issue {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  image_path: string | null;
  status: string;
  profile_id: string;
  flat_id: string;
}

interface Profile {
  id: string;
  name: string;
  surname: string;
}

const IssueDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const { userRole } = useFlatContext();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);

  // 1. ČÁST: Načtení dat (Text + Profil)
  const loadIssueData = useCallback(async () => {
    if (!id || isDeletedRef.current) return;

    setIsLoading(true);

    try {
      // A) Načteme issue
      const { data: issueData, error: issueError } = await supabase
        .from("issues")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (issueError) {
        throw issueError;
      }

      if (!issueData) {
        showToast("Závada nebyla nalezena", "error");
        router.replace("/issues");
        return;
      }
      setIssue(issueData);

      // B) Načteme profil (pokud existuje)
      if (issueData.profile_id) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, surname")
          .eq("id", issueData.profile_id)
          .single();

        if (profileError) {
          console.error("Chyba při načítání profilu:", profileError);
        } else {
          setProfile(profileData);
        }
      }
    } catch (error: any) {
      showToast("Chyba při načítání závady: " + error.message, "error");
      console.error(error);
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast]);

  // useFocusEffect zajistí načtení dat při příchodu na obrazovku
  useFocusEffect(
    useCallback(() => {
      loadIssueData();
    }, [loadIssueData]),
  );

  // 2. ČÁST: Inteligentní načtení obrázku (Effect)
  // Tento efekt se spustí POUZE tehdy, když se změní řetězec 'image_path'.
  // Pokud změníte status, title nebo cokoliv jiného, tento kód se ignoruje -> ŽÁDNÉ BLIKÁNÍ.
  useEffect(() => {
    // Pokud issue nemá obrázek, vyčistíme URI a končíme
    if (!issue?.image_path) {
      setImageUri(null);
      return;
    }

    let isMounted = true; // Ochrana proti memory leaku

    const fetchSignedUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from("issue-images")
          .createSignedUrl(issue.image_path!, 3600); // 1 hodina platnost

        if (error) {
          console.error("Chyba signed URL:", error);
          return;
        }

        if (isMounted && data?.signedUrl) {
          setImageUri(data.signedUrl);
        }
      } catch (error) {
        console.error("Chyba fetch obrázku:", error);
      }
    };

    fetchSignedUrl();

    // Cleanup funkce
    return () => {
      isMounted = false;
    };
  }, [issue?.image_path]); // <--- KLÍČOVÉ: Sledujeme jen cestu k souboru

  // --- Pomocné funkce (UI) ---

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "#1953ff";
      case "in_progress":
        return "#FF9500";
      case "resolved":
        return "#34C759";
      case "cancelled":
        return "#FF3B30";
      default:
        return "#999";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new":
        return "Nová";
      case "in_progress":
        return "Řeší se";
      case "resolved":
        return "Vyřešená";
      case "cancelled":
        return "Zrušená";
      default:
        return status;
    }
  };

  // --- Logika změny stavu ---

  const handleChangeStatus = async () => {
    if (!issue) return;

    const statusCycle: { [key: string]: string } = {
      new: "in_progress",
      in_progress: "resolved",
      resolved: "cancelled",
      cancelled: "new",
    };

    const newStatus = statusCycle[issue.status] || "new";
    await updateStatus(newStatus);
  };

  const updateStatus = async (newStatus: string) => {
    if (!issue || !id) return;

    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("issues")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Aktualizujeme lokální stav (to spustí re-render, ale ne efekt obrázku)
      setIssue({ ...issue, status: newStatus });
      showToast("Stav závady byl změněn", "success");
    } catch (error: any) {
      showToast("Chyba při změně stavu: " + error.message, "error");
      console.error(error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteIssue = () => {
    Alert.alert(
      "Smazat závadu",
      "Opravdu chcete smazat tuto závadu? Tato akce je nevratná.",
      [
        {
          text: "Zrušit",
          style: "cancel",
        },
        {
          text: "Smazat",
          style: "destructive",
          onPress: deleteIssue,
        },
      ],
    );
  };

  const deleteIssue = async () => {
    if (!issue || !id) return;

    setIsDeleting(true);
    try {
      // Pokud má issue obrázek, smažeme ho ze storage
      if (issue.image_path) {
        const { error: storageError } = await supabase.storage
          .from("issue-images")
          .remove([issue.image_path]);

        if (storageError) {
          console.error("Chyba při mazání obrázku:", storageError);
          // Pokračujeme i přes chybu storage, hlavně aby se smazal záznam
        }
      }

      // Smažeme záznam z databáze
      const { error } = await supabase.from("issues").delete().eq("id", id);

      if (error) throw error;
      isDeletedRef.current = true;
      showToast("Závada byla smazána", "success");
      router.replace("/issues");
    } catch (error: any) {
      showToast("Chyba při mazání závady: " + error.message, "error");
      console.error(error);
      setIsDeleting(false);
    }
  };

  // --- Render ---

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!issue) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Závada nebyla nalezena</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Zpět</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Status Badge a tlačítka */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(issue.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(issue.status)}</Text>
          </View>

          <View style={styles.actionButtons}>
            {userRole === "najemce" && (
              <>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => router.push(`/issue-edit?id=${issue.id}`)}
                  disabled={isDeleting}
                >
                  <Ionicons name="pencil" size={18} color="#007AFF" />
                  <Text style={styles.editButtonText}>Upravit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteIssue}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <>
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#FF3B30"
                      />
                      <Text style={styles.deleteButtonText}>Smazat</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {userRole === "pronajimatel" && (
              <TouchableOpacity
                style={styles.changeStatusButton}
                onPress={handleChangeStatus}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <>
                    <Ionicons
                      name="swap-horizontal"
                      size={18}
                      color="#007AFF"
                    />
                    <Text style={styles.changeStatusText}>Změnit stav</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Název závady */}
        <Text style={styles.issueTitle}>{issue.title}</Text>

        {/* Obrázek */}
        {imageUri && (
          <TouchableOpacity
            onPress={() => setViewerVisible(true)}
            activeOpacity={0.8}
            style={styles.imageContainer}
          >
            <Image source={{ uri: imageUri }} style={styles.image} />
          </TouchableOpacity>
        )}

        {/* Popis */}
        {issue.description && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Popis</Text>
            <Text style={styles.descriptionText}>{issue.description}</Text>
          </View>
        )}

        {/* Informace */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Informace</Text>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Vytvořena</Text>
              <Text style={styles.infoValue}>
                {formatDate(issue.created_at)}
              </Text>
            </View>
          </View>

          {profile && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Nahlásil</Text>
                <Text style={styles.infoValue}>
                  {profile.name} {profile.surname}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Tlačítko zpět */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Zpět na seznam</Text>
        </TouchableOpacity>
      </View>

      <DocumentViewerModal
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        imageUri={imageUri}
        fileName={issue.title}
      />
    </ScrollView>
  );
};

export default IssueDetail;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backIconButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    flex: 1,
  },
  content: {
    padding: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    backgroundColor: "#F0F8FF",
  },
  editButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF3B30",
    backgroundColor: "#FFF0F0",
  },
  deleteButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#FF3B30",
    fontWeight: "600",
  },
  changeStatusButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    backgroundColor: "#F0F8FF",
  },
  changeStatusText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  issueTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  imageContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 300,
    backgroundColor: "#f0f0f0",
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  infoEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  backButton: {
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
