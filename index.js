/**
 * @format
 */

import 'react-native-gesture-handler';
import '@shared/lib/cryptoPolyfill';
import '@shared/lib/cryptoPolyfill';
import { AppRegistry } from 'react-native';
import App from '@app';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
