import { StatusBar } from "react-native";
import AuthScreen from "./auth";

export default function Register() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#c93434ff" />
      <AuthScreen />
    </>
  );
}
