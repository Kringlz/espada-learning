export default {
  expo: {
    name: "Espada",
    slug: "espada-learning",
    icon: "./assets/pwa/icons/icon-512.png",
    version: "0.2.1",
    orientation: "default",
    scheme: "espada",
    userInterfaceStyle: "light",
    ios: { supportsTablet: true, bundleIdentifier: "com.espada.learning" },
    android: {
      package: "com.espada.learning",
      // Study reminders tolerate OS delays and do not need alarm-clock access.
      blockedPermissions: [
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.USE_EXACT_ALARM",
      ],
    },
    web: { name: "Espada", bundler: "metro" },
    experiments: { baseUrl: process.env.GITHUB_PAGES_BASE_PATH ?? "" },
    plugins: [
      [
        "expo-notifications",
        { color: "#305C4F", defaultChannel: "study-reminders" },
      ],
      "expo-secure-store",
      "expo-video",
      [
        "expo-audio",
        {
          microphonePermission: false,
          recordAudioAndroid: false,
          enableBackgroundPlayback: false,
        },
      ],
      "expo-font",
      "expo-document-picker",
    ],
    extra: { environment: process.env.APP_ENV ?? "development" },
  },
};
