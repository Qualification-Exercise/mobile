/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from '@app';
import { installGlobalErrorHandlers } from '@shared/lib';
import { name as appName } from './app.json';

// Capture errors React Error boundaries can't see (event handlers, timers, promise
// rejections) as early as possible, before any app code can throw.
installGlobalErrorHandlers();

AppRegistry.registerComponent(appName, () => App);
