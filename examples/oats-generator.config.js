/**
 * Example config for `yarn example:advanced`
 */

const { camel, pascal } = require("case");

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

function customGeneratorSwr({ componentName, verb, route, typeNames, paramsTypes }) {
  if (verb === "get") {
    /**
     * export const useListPets = <Data = any, Error = any>(
        fetcher?: fetcherFn<Data>,
        config?: ConfigInterface<Data, Error>,
      ) => useSWR<Data, Error>(`/pets`, fetcher, config);
     */

    return `
      export const use${componentName} = <Data = ${typeNames.response}, Error = any>(${
      paramsTypes ? paramsTypes + "," : ""
    }fetcher?: fetcherFn<Data>, config?: ConfigInterface<Data, Error>) => useSWR<Data, Error>(\`${route}\`, fetcher, config)
    `;
  } else {
    return "";
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
    customGenerator: customGeneratorHttp,
  },
  "petstore-custom-operation": {
    file: "examples/petstore.yaml",
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
    customGenerator: customGeneratorHttp,
  },
  "petstore-swr": {
    file: "examples/petstore.yaml",
    output: "examples/petstoreSwr.ts",
    customImport: `
      import useSWR from "swr";
      import { fetcherFn, ConfigInterface } from "swr/dist/types";
    `,
    customGenerator: customGeneratorSwr,
  },
};
