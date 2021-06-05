import { Secret } from "@aws-cdk/aws-secretsmanager"
import { Construct } from "@aws-cdk/core"

export interface DatabaseSecretProps {
  username?: string
}

export class DatabaseSecret extends Secret {
  username: string

  constructor(scope: Construct, id: string, props?: DatabaseSecretProps) {
    const username = props?.username || "dbadmin"

    super(scope, id, {
      // make a nice set of credentials for us
      generateSecretString: {
        passwordLength: 16,
        generateStringKey: "password",
        secretStringTemplate: JSON.stringify({ username }),
        excludeCharacters: '"@/%:\\',
      },
    })

    this.username = username
  }
}
