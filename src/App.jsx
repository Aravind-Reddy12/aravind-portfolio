import WorldCanvas from './canvas/WorldCanvas';
import ThemeToggle from './components/ThemeToggle';
import WorldScrubber from './components/WorldScrubber';
import BuildingModal from './components/BuildingModal';
import OnboardingHint from './components/OnboardingHint';
import StyleHUD from './components/StyleHUD';
import SpeedHUD from './components/SpeedHUD';

export default function App() {
  return (
    <>
      <WorldCanvas />
      <OnboardingHint />
      <ThemeToggle />
      <WorldScrubber />
      <StyleHUD />
      <SpeedHUD />
      <BuildingModal />
    </>
  );
}
