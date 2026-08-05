const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Add import
code = code.replace(
  "import FloatingStreakWidget from './components/FloatingStreakWidget';",
  "import FloatingStreakWidget from './components/FloatingStreakWidget';\nimport RoadmapView from './components/RoadmapView';"
);

// Add to Dashboard cards
code = code.replace(
  "{ id: AppMode.NOTES, label: \"Notes & Schedule\", icon: Calendar },",
  "{ id: AppMode.NOTES, label: \"Notes & Schedule\", icon: Calendar },\n    { id: AppMode.ROADMAP, label: \"Learning Roadmap\", icon: Sparkles },"
);

code = code.replace(
  "id: AppMode.NOTES,",
  "id: AppMode.NOTES,"
); // just checking, maybe we don't need to add it to dashboardStats unless we want to

// Add router case
const caseNotes = `      case AppMode.NOTES:
        return (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <NotesView
              userId={user ? user.uid : "guest"}
              onDeductCredit={deductCredit}
              userProfile={userProfile}
            />
          </div>
        );`;

const caseRoadmap = `      case AppMode.ROADMAP:
        return (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <RoadmapView
              history={history}
              userProfile={userProfile}
            />
          </div>
        );
`;

code = code.replace(caseNotes, caseRoadmap + '\n' + caseNotes);

fs.writeFileSync('App.tsx', code);
