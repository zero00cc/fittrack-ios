import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { LiftingProfile, Gender, getWeightClass } from '../types/ranking.types';

function mapRow(row: any): LiftingProfile {
  return {
    userId:      row.user_id,
    displayName: row.display_name ?? 'Anonymous',
    gender:      row.gender,
    bodyMass:    row.body_mass,
    squat:       row.squat,
    bench:       row.bench,
    deadlift:    row.deadlift,
    total:       row.total ?? row.squat + row.bench + row.deadlift,
    weightClass: row.weight_class,
    updatedAt:   row.updated_at,
  };
}

export function useLeaderboard() {
  const { user } = useAuth();
  const [myProfile,    setMyProfile]    = useState<LiftingProfile | null>(null);
  const [leaderboard,  setLeaderboard]  = useState<LiftingProfile[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [boardLoading,  setBoardLoading]  = useState(false);

  // Fetch own profile once on sign-in
  useEffect(() => {
    if (!user) return;
    supabase
      .from('leaderboard')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setMyProfile(mapRow(data));
        setProfileLoaded(true);
      });
  }, [user?.id]);

  const upsertProfile = useCallback(async (
    displayName: string,
    gender:      Gender,
    bodyMass:    number,
    squat:       number,
    bench:       number,
    deadlift:    number,
  ): Promise<string | null> => {
    if (!user) return 'Not signed in';
    const weightClass = getWeightClass(bodyMass, gender);
    const { data, error } = await supabase
      .from('leaderboard')
      .upsert(
        {
          user_id:      user.id,
          display_name: displayName || user.email?.split('@')[0] || 'Athlete',
          gender,
          body_mass:    bodyMass,
          squat,
          bench,
          deadlift,
          weight_class: weightClass,
          updated_at:   new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single();
    if (error) return error.message;
    if (data) setMyProfile(mapRow(data));
    return null;
  }, [user?.id]);

  const fetchLeaderboard = useCallback(async (weightClass: string, gender: Gender) => {
    setBoardLoading(true);
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('weight_class', weightClass)
      .eq('gender', gender)
      .order('total', { ascending: false })
      .limit(100);
    setLeaderboard((data ?? []).map(mapRow));
    setBoardLoading(false);
  }, []);

  return {
    myProfile,
    profileLoaded,
    leaderboard,
    boardLoading,
    upsertProfile,
    fetchLeaderboard,
  };
}
