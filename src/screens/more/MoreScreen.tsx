import { Route, Routes } from 'react-router-dom';
import { AboutScreen } from './AboutScreen';
import { BackupScreen } from './BackupScreen';
import { CoreScreen } from './CoreScreen';
import { EditIndex } from './edit/EditIndex';
import { EntityList } from './edit/EntityList';
import { ExerciseForm } from './edit/ExerciseForm';
import { IngredientForm } from './edit/IngredientForm';
import { MealForm } from './edit/MealForm';
import { SessionForm } from './edit/SessionForm';
import { GuideScreen } from './GuideScreen';
import { MoreIndex } from './MoreIndex';
import { ResetScreen } from './ResetScreen';
import { SeedUpdateScreen } from './SeedUpdateScreen';
import { SettingsScreen } from './SettingsScreen';

export function MoreScreen() {
  return (
    <Routes>
      <Route index element={<MoreIndex />} />
      <Route path="core" element={<CoreScreen />} />
      <Route path="guide" element={<GuideScreen />} />
      <Route path="data" element={<EditIndex />} />
      <Route path="data/ingredienser/:id" element={<IngredientForm />} />
      <Route path="data/maltider/:id" element={<MealForm />} />
      <Route path="data/ovelser/:id" element={<ExerciseForm />} />
      <Route path="data/okter/:id" element={<SessionForm />} />
      <Route path="data/:table" element={<EntityList />} />
      <Route path="innstillinger" element={<SettingsScreen />} />
      <Route path="backup" element={<BackupScreen />} />
      <Route path="oppdater" element={<SeedUpdateScreen />} />
      <Route path="om" element={<AboutScreen />} />
      <Route path="nullstill" element={<ResetScreen />} />
      <Route path="*" element={<MoreIndex />} />
    </Routes>
  );
}
