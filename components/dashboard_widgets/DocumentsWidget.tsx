import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useFlatContext } from "../../contexts/FlatContext";
import { Document } from "../../types/documents";

export const DocumentsWidget = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentFlat } = useFlatContext();

  useEffect(() => {
    // 1. Prvotní načtení dat
    loadDocuments();

    // Pokud nemáme flat_id, nemá smysl nic poslouchat
    if (!currentFlat?.id) return;

    // 2. Vytvoření Realtime kanálu
    const documentsChannel = supabase
      .channel("public:documents") // Název kanálu (může být cokoliv)
      .on(
        "postgres_changes",
        {
          event: "*", // Chceme poslouchat vše (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "documents",
          filter: `flat_id=eq.${currentFlat.id}`, // MAGIE: Posloucháme jen náš byt!
        },
        (payload) => {
          console.log("Změna v dokumentech detekována!", payload);
          // Když se něco změní (někdo přidá/upraví výdaj), přenačteme widget
          loadDocuments();
        },
      )
      .subscribe();

    // 3. Úklid při opuštění obrazovky (zavře trubku a šetří limit 200 připojení)
    return () => {
      supabase.removeChannel(documentsChannel);
    };
  }, [currentFlat]);

  const loadDocuments = async () => {
    if (!currentFlat?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("flat_id", currentFlat.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error loading documents:", error);
      } else {
        setDocuments(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("cs-CZ");
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return "document-text-outline";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "image-outline";
      case "doc":
      case "docx":
        return "document-outline";
      case "xls":
      case "xlsx":
        return "grid-outline";
      default:
        return "document-outline";
    }
  };

  return (
    <Card className="mb-4">
      <Pressable onPress={() => router.push("/(tabs)/documents")}>
        <CardHeader>
          <View className="flex-row items-center justify-between">
            <CardTitle>Dokumenty</CardTitle>
            <Ionicons name="document-text-outline" size={24} color="#6366f1" />
          </View>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" />
            </View>
          ) : documents.length === 0 ? (
            <Text className="text-muted-foreground text-sm">
              Zatím žádné dokumenty
            </Text>
          ) : (
            <View>
              {documents.map((doc) => (
                <Pressable
                  key={doc.id}
                  onPress={() => router.push("/(tabs)/documents")}
                  className="py-2 border-b border-border last:border-b-0"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 gap-2">
                      <Ionicons
                        name={getFileIcon(doc.name)}
                        size={20}
                        color="#6b7280"
                      />
                      <View className="flex-1">
                        <Text
                          className="text-sm font-semibold text-foreground"
                          numberOfLines={1}
                        >
                          {doc.name}
                        </Text>
                        {doc.description && (
                          <Text
                            className="text-xs text-muted-foreground mt-0.5"
                            numberOfLines={1}
                          >
                            {doc.description}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View className="ml-2">
                      <Text className="text-xs text-muted-foreground">
                        {formatDate(doc.created_at)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </CardContent>
      </Pressable>
    </Card>
  );
};
