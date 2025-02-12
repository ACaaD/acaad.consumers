import { IComponentConfiguration, IMockedComponentModel } from '../types';
import { ComponentDescriptor } from '@acaad/abstractions';
import { getTestLogger } from '../../utility';

const defaultResponses = {
  responses: {
    200: {
      'application/json': {
        examples: {
          success: {
            empty: 'string'
          }
        }
      }
    }
  }
};

function getSensorComponent(cd: ComponentDescriptor) {
  return {
    [`/components/${cd.toIdentifier()}`]: {
      get: {
        ...defaultResponses,
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
      post: {
        ...defaultResponses,
        acaad: {
          component: {
            name: `${cd.toIdentifier()}`,
            type: 'button'
          },
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
        ...defaultResponses,
        acaad: {
          component: {
            name: `${cd.toIdentifier()}`,
            type: 'switch'
          },
          onIff: true,
          queryable: true
        }
      }
    },
    [`/components/${cd.toIdentifier()}/on`]: {
      post: {
        ...defaultResponses,
        acaad: {
          component: {
            name: `${cd.toIdentifier()}`,
            type: 'switch'
          },
          onIff: true,
          actionable: true,
          forValue: true
        }
      }
    },
    [`/components/${cd.toIdentifier()}/off`]: {
      post: {
        ...defaultResponses,
        acaad: {
          component: {
            name: `${cd.toIdentifier()}`,
            type: 'switch'
          },
          onIff: true,
          actionable: true,
          forValue: false
        }
      }
    }
  };
}

function openApi(componentModel: IMockedComponentModel) {
  const log = getTestLogger('open-api-route');

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

  log(`Generated path object in ${Date.now() - startMs}ms.`);
  const openApiBody = {
    openapi: '3.0.0',
    info: {
      title: 'OpenAPI',
      version: '1.0.0',
      acaad: 'commit-hash'
    },
    paths: pathObj
  };

  const route = [
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
            body: openApiBody
          }
        }
      ]
    }
  ];

  return { route, openApiBody };
}

export default openApi;
