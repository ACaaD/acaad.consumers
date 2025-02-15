const collectionFactory = () => [
  {
    id: 'base', // collection id
    routes: [] // collection routes
  },
  {
    id: 'generated',
    from: 'base',
    routes: ['openApi:generated']
  },
  {
    id: 'missing-acaad-metadata',
    from: 'base',
    routes: ['openApi:missing-acaad-metadata']
  },
  {
    id: 'empty-response',
    from: 'base',
    routes: ['openApi:empty-response']
  },
  {
    id: '400-status',
    from: 'base',
    routes: ['openApi:400-status']
  },
  {
    id: '403-status',
    from: 'base',
    routes: ['openApi:403-status']
  },
  {
    id: '500-status',
    from: 'base',
    routes: ['openApi:500-status']
  },
  {
    id: 'realistic',
    from: 'base',
    routes: ['openApi:realistic']
  }
];

export default collectionFactory;
