import type { FieldWidgetConfig, PluginDescriptor, ResolvedPlugin } from "emdash";
import { definePlugin } from "emdash";

const fieldWidgets: FieldWidgetConfig[] = [
  {
    name: "entry-picker",
    label: "Content entry picker",
    fieldTypes: ["reference"],
  },
];

export function contentReference(): PluginDescriptor {
  return {
    id: "content-reference",
    version: "1.0.0",
    format: "native",
    entrypoint: "@/plugins/content-reference",
    adminEntry: "@/plugins/content-reference-admin",
    fieldWidgets,
  };
}

export function createPlugin(): ResolvedPlugin {
  return definePlugin({
    id: "content-reference",
    version: "1.0.0",
    admin: { fieldWidgets },
  });
}
