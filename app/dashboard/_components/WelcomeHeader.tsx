import GamificationInline from './GamificationInline';

const greetingByTime = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatDate = () => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function WelcomeHeader({ name }: { name: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
      <div>
        <h1
          className="text-lg sm:text-xl font-normal text-slate-900 tracking-tight"
        >
          {greetingByTime()}, {name || 'Learner'}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">{formatDate()}</p>
      </div>
      <GamificationInline />
    </div>
  );
}
