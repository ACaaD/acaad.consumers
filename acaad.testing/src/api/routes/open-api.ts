import { IComponentConfiguration, IMockedComponentModel } from '../types';
import { ComponentDescriptor } from '@acaad/abstractions';

function getSensorComponent(cd: ComponentDescriptor) {
  return {
    [`/components/${cd.toIdentifier()}`]: {
      get: {
        acaad: {
          component: {
            name: `${cd.toIdentifier()}`,
            type: 'sensor'
          },
          queryable: true
        }
      }
    }
  };
}

function getButtonComponent(cd: ComponentDescriptor) {
  return {
    [`/components/${cd.toIdentifier()}`]: {
      get: {
        acaad: {
          component: {
            name: `${cd.toIdentifier()}`,
            type: 'button'
          },
          queryable: false,
          actionable: true
        }
      }
    }
  };
}

function getSwitchComponent(cd: ComponentDescriptor) {
  return {
    [`/components/${cd.toIdentifier()}`]: {
      get: {
        acaad: {
          component: {
            name: `${cd.toIdentifier()}`,
            type: 'switch'
          },
          queryable: true,
          actionable: true
        }
      }
    }
  };
}

function openApi(componentModel: IMockedComponentModel) {
  const startMs = Date.now();

  let pathObj = (componentModel.sensors ?? []).reduce(
    (prev: object, cd, idx) => ({
      ...prev,
      ...getSensorComponent(cd)
    }),
    {}
  );

  pathObj = (componentModel.buttons ?? []).reduce(
    (prev: object, cd, idx) => ({
      ...prev,
      ...getButtonComponent(cd)
    }),
    pathObj
  );

  pathObj = (componentModel.switches ?? []).reduce(
    (prev: object, cd, idx) => ({
      ...prev,
      ...getSwitchComponent(cd)
    }),
    pathObj
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
              paths: pathObj
            }
          }
        }
      ]
    }
  ];

  return result;
}

export default openApi;
