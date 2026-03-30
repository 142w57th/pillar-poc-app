"use client";

import { useTheme } from "@/lib/theme";

export default function SettingsPage() {
  const { theme, setTheme, options } = useTheme();

  return (
    <div className="border-app bg-surface-1 mx-auto w-full max-w-4xl rounded-2xl border p-5 shadow-sm @md:p-6">
      <h2 className="text-app-primary text-2xl font-semibold">Settings</h2>
      <p className="text-app-secondary mt-2 text-sm">
        Choose a visual theme for your workspace. Your selection is saved on this device.
      </p>

      <section className="mt-5">
        <h3 className="text-app-primary text-sm font-semibold uppercase tracking-[0.12em]">Theme</h3>

        <div className="mt-3 grid grid-cols-1 gap-3 @md:grid-cols-2">
          {options.map((option) => {
            const isSelected = theme === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className={`border-app bg-surface-2 rounded-xl border p-4 text-left transition ${
                  isSelected ? "ring-2 ring-[color:var(--accent)]" : "hover:opacity-90"
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-app-primary text-base font-semibold">{option.name}</p>
                    <p className="text-app-secondary mt-1 text-sm">{option.description}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ${
                      isSelected ? "bg-app-accent text-app-accent-contrast border-transparent" : "border-app text-app-muted"
                    }`}
                  >
                    {isSelected ? "Active" : "Choose"}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {option.previewColors.map((color) => (
                    <span
                      key={`${option.id}-${color}`}
                      className="h-5 w-5 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
