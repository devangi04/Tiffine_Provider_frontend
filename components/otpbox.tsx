import React, { useRef } from "react";
import { View, TextInput, StyleSheet } from "react-native";

interface OTPInputProps {
  otp: string;
  setOtp: (otp: string) => void;
  length: number; // dynamic length
}

const OTPInputBoxes: React.FC<OTPInputProps> = ({ otp, setOtp, length }) => {
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    let otpArray = otp.split("");
    otpArray[index] = text;
    setOtp(otpArray.join("").slice(0, length));

    if (text && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

const handleKeyPress = (e: any, index: number) => {
  if (e.nativeEvent.key === "Backspace") {
    let otpArray = otp.split("");
    if (otpArray[index]) {
      // If current box has a value, clear it
      otpArray[index] = "";
      setOtp(otpArray.join(""));
    } else if (index > 0) {
      // If current box is empty, move focus to previous
      inputs.current[index - 1]?.focus();
      otpArray[index - 1] = ""; // also clear previous box
      setOtp(otpArray.join(""));
    }
  }
};


  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, i) => (
        <TextInput
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          style={styles.box}
          value={otp[i] || ""}
          onChangeText={(text) => handleChange(text, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 10,
  },
  box: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#e1e5e9",
    borderRadius: 8,
    fontSize: 24,
    color: "#1a1a1a",
  },
});

export default OTPInputBoxes;
