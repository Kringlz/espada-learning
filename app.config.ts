export default {
  expo: {
    name: "Espada",
    slug: "espada-learning",
    version: "0.2.0",
    orientation: "default",
    scheme: "espada",
    userInterfaceStyle: "light",
    ios: { supportsTablet: true, bundleIdentifier: "com.espada.learning" },
    android: { package: "com.espada.learning" },
    web: { name: "Espada · Каждый день — шаг вперёд", bundler: "metro" },
    experiments: { baseUrl: process.env.GITHUB_PAGES_BASE_PATH ?? "" },
    plugins: [
      "expo-secure-store",
      "expo-video",
      "expo-font",
      "expo-document-picker",
    ],
    extra: { environment: process.env.APP_ENV ?? "development" },
  },
};
