import { NewMessageRequest } from "../events";
import { JanPlugin } from "../plugin";

/**
 * An abstract class representing an Inference Plugin for Jan.
 */
export abstract class InferencePlugin extends JanPlugin {
  /**
   * Initializes the model for the plugin.
   * @param modelFileName - The name of the file containing the model.
   */
  abstract initModel(modelFileName: string): Promise<void>;

  /**
   * Stops the model for the plugin.
   */
  abstract stopModel(): Promise<void>;

  /**
   * Processes an inference request.
   * @param data - The data for the inference request.
   * @returns The result of the inference request.
   */
  abstract inferenceRequest(data: NewMessageRequest): Promise<any>;
}
