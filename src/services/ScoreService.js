import { supabase } from '../config/supabase'

export class ScoreService {
    static async saveScore(score, playerName) {
        try {
            const { data, error } = await supabase
                .from('high_scores')
                .insert([
                    { 
                        score: score,
                        player_name: playerName,
                        created_at: new Date()
                    }
                ])

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error saving score:', error)
            throw error
        }
    }

    static async getTopScores(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('high_scores')
                .select('*')
                .order('score', { ascending: false })
                .limit(limit)

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error fetching scores:', error)
            throw error
        }
    }
} 