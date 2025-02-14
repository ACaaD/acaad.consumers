const routes = [
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

export default routes;
