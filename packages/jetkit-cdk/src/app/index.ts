export interface IApp {
  /**
   * Create a new set of CRUD endpoints for a model
   */
  addCrudResource(): void;
}

export { JetKitCdkApp } from "./cdk";
