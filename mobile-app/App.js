import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";

const DEFAULT_URL = "https://myproject-production-ed20.up.railway.app/dashboard";
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || DEFAULT_URL;

export default function App() {
  const webRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loadError, setLoadError] = useState("");

  const source = useMemo(() => ({ uri: SERVER_URL }), []);

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, [canGoBack]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      <WebView
        ref={webRef}
        source={source}
        onLoadStart={() => {
          setLoading(true);
          setLoadError("");
        }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setLoadError(
            `Cannot open ${SERVER_URL}. Set EXPO_PUBLIC_SERVER_URL to your Railway domain (https://.../login).`
          );
        }}
        onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        startInLoadingState
      />

      {loading ? (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#74c691" />
        </View>
      ) : null}

      {loadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#09110d",
  },
  loaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(9, 17, 13, 0.55)",
  },
  errorBox: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(26, 10, 10, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 125, 125, 0.45)",
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: "#ffd2d2",
    fontSize: 13,
    lineHeight: 18,
  },
});
