import {
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
} from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog } from "@/components/ui/alert-dialog";
import React, { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import DocumentViewerModal from "@/components/DocumentViewerModal";
import { Ionicons } from "@expo/vector-icons";
import { deleteFile } from "@/lib/fileService";
import { Document } from "@/types/documents";

const documents = () => {
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    document_path: string;
    name: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{
    id: string;
    document_path: string;
    name: string;
  } | null>(null);

  const loadDocuments = async () => {
    if (!currentFlat) return;

    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("flat_id", currentFlat.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error: any) {
      showToast("Chyba při načítání dokumentů", "error");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (currentFlat?.id) {
        loadDocuments();
      }
    }, [currentFlat]),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("cs-CZ");
  };

  const handleOpenDocument = (
    document_path: string,
    name: string = "Dokument",
  ) => {
    setSelectedDocument({ document_path, name });
    setViewerVisible(true);
  };

  const handleDownloadDocument = async (
    document_path: string,
    name: string,
  ) => {
    try {
      // Získání podepsané URL s download parametrem
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(document_path, 3600, {
          download: name, // Nastaví Content-Disposition: attachment; filename="name"
        });

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Nepodařilo se získat URL");

      // Otevřít URL v prohlížeči - soubor se automaticky stáhne díky download parametru
      const canOpen = await Linking.canOpenURL(data.signedUrl);
      if (canOpen) {
        await Linking.openURL(data.signedUrl);
        showToast("Stahování dokumentu...", "success");
      } else {
        throw new Error("Nelze otevřít odkaz");
      }
    } catch (error: any) {
      showToast("Chyba při stahování: " + error.message, "error");
      console.error(error);
    }
  };

  const handleDeleteDocument = (
    id: string,
    document_path: string,
    name: string,
  ) => {
    setDocumentToDelete({ id, document_path, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;

    try {
      await deleteFile({
        bucket: "documents",
        path: documentToDelete.document_path,
        tableName: "documents",
        recordId: documentToDelete.id,
      });

      showToast("Dokument smazán", "success");
      loadDocuments();
    } catch (error: any) {
      showToast("Chyba při mazání: " + error.message, "error");
      console.error(error);
    }
  };

  const renderDocument = (item: Document) => (
    <Card key={item.id} className="mb-3 py-4">
      <CardContent className="flex-row items-center px-4 gap-3">
        {/* Ikona dokumentu */}
        <Ionicons
          name="document-text-outline"
          size={24}
          className="text-primary-foreground"
        />

        {/* Obsah dokumentu */}
        <Pressable
          className="flex-1"
          onPress={() => handleOpenDocument(item.document_path, item.name)}
        >
          <Text className="text-base font-semibold text-foreground mb-0.5">
            {item.name}
          </Text>
          {item.description && (
            <Text
              className="text-xs text-muted-foreground mb-1"
              numberOfLines={1}
            >
              {item.description}
            </Text>
          )}
          <View className="flex-row items-center gap-1">
            <Ionicons
              name="calendar-outline"
              size={11}
              className="text-muted-foreground"
            />
            <Text className="text-xs text-muted-foreground flex-1">
              {formatDate(item.created_at)}
            </Text>
          </View>
        </Pressable>

        {/* Akční tlačítka */}
        <View className="flex-row gap-1">
          <Pressable
            className="w-10 h-10 items-center justify-center"
            onPress={() =>
              handleDownloadDocument(item.document_path, item.name)
            }
          >
            <Ionicons
              name="download-outline"
              size={22}
              className="text-foreground"
            />
          </Pressable>

          <Pressable
            className="w-10 h-10 items-center justify-center"
            onPress={() =>
              handleDeleteDocument(item.id, item.document_path, item.name)
            }
          >
            <Ionicons
              name="trash-outline"
              size={22}
              className="text-destructive"
            />
          </Pressable>
        </View>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        <Text className="text-3xl font-bold text-foreground mb-4">
          Dokumenty
        </Text>
        {documents.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons
              name="document-text-outline"
              size={64}
              className="text-muted-foreground"
            />
            <Text className="text-base text-muted-foreground mt-4 text-center w-full">
              Zatím žádné dokumenty
            </Text>
          </View>
        ) : (
          <>{documents.map(renderDocument)}</>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
        onPress={() => router.push("/document-add")}
      >
        <Ionicons name="add" size={28} className="text-primary-foreground" />
      </Pressable>

      <DocumentViewerModal
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        filePath={selectedDocument?.document_path || null}
        fileName={selectedDocument?.name}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Smazat dokument"
        description={`Opravdu chcete smazat dokument "${documentToDelete?.name}"?`}
        actionText="Smazat"
        onAction={confirmDelete}
        destructive
      />
    </View>
  );
};

export default documents;
