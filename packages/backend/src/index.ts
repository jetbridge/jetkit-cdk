export { app } from "./app";
import { TopicCrudApi, blargRoute } from "./api/topic";

// a list of resources we would like infrastructure generated for
export const stackResources = [TopicCrudApi, blargRoute];
