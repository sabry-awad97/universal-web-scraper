import { JsonPayloadSchema } from "@/schemas";
import { JsonPayload, MessageType } from "@/types";
import JSON5 from "json5";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

const MessageSchema = z.object({
  type: z.nativeEnum(MessageType),
  payload: z.string(),
});

export function useEventSource(url: string) {
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [receivedJsonData, setReceivedJsonData] = useState<JsonPayload>([]);

  const handleIncomingMessage = useCallback((event: MessageEvent<string>) => {
    try {
      const parsedMessage = MessageSchema.parse(JSON5.parse(event.data));

      console.log("Received message:", parsedMessage.type);

      switch (parsedMessage.type) {
        case MessageType.Success: {
          const jsonPayload = JsonPayloadSchema.parse(
            JSON5.parse(parsedMessage.payload),
          );
          setReceivedJsonData(jsonPayload);
          break;
        }
        case MessageType.Progress: {
          console.log("Received progress:", parsedMessage.payload);
          break;
        }
        case MessageType.Error: {
          console.error("Received error:", parsedMessage.payload);
          break;
        }
        case MessageType.Warning: {
          console.warn("Received warning:", parsedMessage.payload);
          break;
        }
        case MessageType.Raw: {
          console.log("Received raw:", parsedMessage.payload);
          break;
        }
      }
    } catch (error) {
      console.error("Error parsing or validating message:", error);
    }
  }, []);

  useEffect(() => {
    let eventSource: EventSource;

    const initializeConnection = () => {
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
      };

      eventSource.onmessage = handleIncomingMessage;

      eventSource.onerror = (error) => {
        console.error("EventSource failed:", error);
        setConnectionError("Connection error");
        setIsConnected(false);
        eventSource.close();
        setTimeout(initializeConnection, 5000);
      };
    };

    initializeConnection();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [url, handleIncomingMessage]);

  return {
    connectionError,
    isConnected,
    receivedJsonData,
  };
}
