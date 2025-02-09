function getSensorComponent(identifier: number) {
  return {
    [`/components/sensor-${identifier}`]: {
      get: {
        acaad: {
          component: {
            name: `sensor-${identifier}`,
            type: 'sensor'
          },
          queryable: true
        }
      }
    }
  };
}

function openApi(componentCount: number = 1) {
  const startMs = Date.now();

  const pathsObj = Array.from({ length: componentCount }).reduce(
    (prev: object, _, idx) => ({
      ...prev,
      ...getSensorComponent(idx)
    }),
    {}
  );

  console.log(`[T-FWK] Generated path object in ${Date.now() - startMs}ms.`);

  const result = [
    {
      id: 'openApi', // id of the route
      url: '/openapi/v1.json', // url in path-to-regexp format
      method: 'GET', // HTTP method
      variants: [
        {
          id: 'sensor', // id of the variant
          type: 'json', // variant type
          options: {
            status: 200,
            body: {
              info: {
                title: 'OpenAPI',
                version: '1.0.0',
                acaad: 'commit-hash'
              },
              paths: pathsObj
            }
          }
        }
      ]
    }
  ];

  return result;
}

export default openApi;
