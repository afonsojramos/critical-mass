import type { FieldWidgetConfig, PluginDescriptor, ResolvedPlugin } from "emdash";
import { definePlugin } from "emdash";

const fieldWidgets: FieldWidgetConfig[] = [
  {
    name: "month-year",
    label: "Month and year",
    fieldTypes: ["string", "text"],
  },
];

const adminPages = [{ path: "/bulk-upload", label: "Gallery bulk upload", icon: "upload" }];

export function galleryTools(): PluginDescriptor {
  return {
    id: "gallery-tools",
    version: "1.0.0",
    format: "native",
    entrypoint: "@/plugins/gallery-tools",
    adminEntry: "@/plugins/gallery-tools-admin",
    adminPages,
    fieldWidgets,
  };
}

export function createPlugin(): ResolvedPlugin {
  return definePlugin({
    id: "gallery-tools",
    version: "1.0.0",
    admin: { pages: adminPages, fieldWidgets },
  });
}
