import React from "react";
import { useRouter } from "expo-router";
import CreateFlatForm from "../components/CreateFlatForm";

export default function CreateAnotherFlat() {
  return <CreateFlatForm showBackButton={false} />;
}
