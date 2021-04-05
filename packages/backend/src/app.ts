import { CorsHttpMethod, Duration, JetKitCdkApp } from "@jetkit/cdk";

export const App = new JetKitCdkApp({
  config: {
    api: {
      corsPreflight: {
        allowMethods: [CorsHttpMethod.ANY],
        allowCredentials: true,
        maxAge: Duration.days(10),
      },
    },
  },
});
