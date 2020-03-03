/**
 * Example config for `yarn example:advanced`
 */

const { camel } = require("case");

function customGeneratorHttp({ componentName, verb, route, typeNames, paramsTypes }) {
  if (verb === "get") {
    return `
      export const ${camel(componentName)} = (${paramsTypes ? paramsTypes + "," : ""}params?: ${
      typeNames.query
    }, config?: RequestConfig) => clientInstance.get<${typeNames.response}>(\`${route}\`, params, config)
    `;
  } else {
    return `
      export const ${camel(componentName)} = (${paramsTypes ? paramsTypes + "," : ""}body: ${
      typeNames.body
    }, config?: RequestConfig) => clientInstance.${verb}<${typeNames.response}>(\`${route}\`, body, config)
    `;
  }
}

module.exports = {
  "petstore-file": {
    file: "examples/petstore.yaml",
    output: "examples/petstoreFromFileSpecWithConfig.ts",
  },
  "petstore-github": {
    github: "OAI:OpenAPI-Specification:master:examples/v3.0/petstore.yaml",
    output: "examples/petstoreFromGithubSpecWithConfig.ts",
    customImport: "/* a custom import */",
    customProps: {
      base: `"http://my-pet-store.com"`,
    },
  },
  "petstore-custom-fetch": {
    file: "examples/petstore.yaml",
    output: "examples/petstoreFromFileSpecWithCustomFetch.ts",
    customImport: `
      import { HttpClient, RequestConfig } from './Http'
      export const clientInstance = new HttpClient();
    `,
    customGeneratorHttp,
  },
  "petstore-custom-operation": {
    file: "swagger.json",
    output: "examples/petstoreFromFileSpecWithCustomOperation.ts",
    customOperationNameGenerator: ({ verb, route }) => {
      const words = route.replace("/api/v1/", "").split("/");

      const entities = words.filter(word => !word.includes("{"));
      const operators = words
        .filter(word => word.includes("{"))
        .map(word => {
          return camel(["by", word].join(" "));
        });

      return camel([verb, ...entities, ...operators].join(" "));
    },
    customImport: `
      import { HttpClient, RequestConfig } from './Http'
      export const clientInstance = new HttpClient();
    `,
    customGeneratorHttp,
  },
};
