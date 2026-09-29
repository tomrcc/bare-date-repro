import { dateToRfc3339 } from "@11ty/eleventy-plugin-rss";
import editableRegions from "@cloudcannon/editable-regions/eleventy";

export default function (eleventyConfig) {
	// The RSS plugin only registers its date filters for Nunjucks. The editor
	// bundle has its own port of this filter.
	eleventyConfig.addFilter("dateToRfc3339", dateToRfc3339);
	eleventyConfig.addPlugin(editableRegions, { verbose: true });

	return {
		dir: {
			input: "src",
			includes: "_includes",
			layouts: "_layouts",
			output: "_site",
		},
	};
}
