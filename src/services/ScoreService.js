import { supabase } from '../config/supabase'

export class ScoreService {
    static async saveScore(score, playerName, obstaclesDestroyed) {
        try {
            const wholeScore = Math.floor(score);
            
            const { data, error } = await supabase
                .from('high_scores')
                .insert([
                    { 
                        score: wholeScore,
                        player_name: playerName,
                        obstacles_destroyed: obstaclesDestroyed,
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

    static formatScore(score) {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(score);
    }

    static async getTopScores(limit = 100) {
        try {
            const { data, error } = await supabase
                .from('high_scores')
                .select('*')
                .order('score', { ascending: false })
                .limit(limit)

            if (error) {
                console.error('Supabase error:', error)
                throw error
            }
            
            const formattedData = data?.map(score => ({
                ...score,
                formattedScore: this.formatScore(score.score)
            })) || [];
            
            return formattedData;
        } catch (error) {
            console.error('Error fetching scores:', error)
            throw error
        }
    }
} 