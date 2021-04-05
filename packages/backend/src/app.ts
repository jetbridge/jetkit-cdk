import { CorsHttpMethod, Duration, JetKitCdkApp } from "@jetkit/cdk";

export const app = new JetKitCdkApp({
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
