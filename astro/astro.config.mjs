import editableRegions from "@cloudcannon/editable-regions/astro-integration";
import { defineConfig } from "astro/config";

export default defineConfig({
	integrations: [editableRegions()],
});
