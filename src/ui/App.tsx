import type { Dispatch } from 'react';
import { useReducer } from 'react';
import type { UiAction, UiState } from './store';
import { initialUiState, uiReducer } from './store';
import Setup from './screens/Setup';
import Planning from './screens/Planning';
import AiConferring from './screens/AiConferring';
import Action from './screens/Action';
import RoundSummary from './screens/RoundSummary';
import Winners from './screens/Winners';
import HotseatHandoff from './screens/HotseatHandoff';

export default function App() {
  const [state, dispatch] = useReducer(uiReducer, initialUiState);

  switch (state.screen) {
    case 'setup':         return <Setup state={state} dispatch={dispatch} />;
    case 'planning':      return <Planning state={state} dispatch={dispatch} />;
    case 'hotseat':       return <HotseatHandoff state={state} dispatch={dispatch} />;
    case 'aiConferring':  return <AiConferring state={state} dispatch={dispatch} />;
    case 'action':        return <Action state={state} dispatch={dispatch} />;
    case 'roundSummary':  return <RoundSummary state={state} dispatch={dispatch} />;
    case 'winners':       return <Winners state={state} dispatch={dispatch} />;
  }
}

export type ScreenProps = {
  state: UiState;
  dispatch: Dispatch<UiAction>;
};
