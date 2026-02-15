import React from "react";
import { useRouter } from "expo-router";
import JoinFlatForm from "../components/JoinFlatForm";
import { Alert } from "react-native";

export default function JoinAnotherFlat() {
  return <JoinFlatForm showCreateOption={false} />;
}
