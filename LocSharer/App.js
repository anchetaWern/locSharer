import React, { Component } from 'react';

import { StackNavigator } from 'react-navigation';

import IndexPage from './src/components/index';
import MapPage from './src/components/map_page';

const Page = StackNavigator({
  Home: { screen: IndexPage },
  MapPage: { screen: MapPage },
});

export default class App extends Component<{}> {

  render() {
    return <Page />
  }
}