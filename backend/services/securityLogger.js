import SecurityEvent from "../models/SecurityEvent.js";

class SecurityLogger {
  static async logEvent(eventData) {
    try {
      const event = new SecurityEvent(eventData);
      await event.save();
      
      // Console log for development
      const emoji = this.getSeverityEmoji(eventData.severity);
      console.log(`${emoji} SECURITY: ${eventData.message}`);
      
      return event;
    } catch (error) {
      console.error("Security logging error:", error);
    }
  }

  static getSeverityEmoji(severity) {
    const emojis = {
      low: '🔵',
      medium: '🟡', 
      high: '🟠',
      critical: '🔴'
    };
    return emojis[severity] || '⚪';
  }

  static async getRecentEvents(limit = 50) {
    return await SecurityEvent.find()
      .populate('userId', 'username profile')
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  static async getStats(timeframe = '24h') {
    const timeFilter = this.getTimeFilter(timeframe);
    
    const stats = await SecurityEvent.aggregate([
      { $match: { timestamp: timeFilter } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          severities: {
            $push: '$severity'
          }
        }
      }
    ]);

    return stats;
  }

  static getTimeFilter(timeframe) {
    const now = new Date();
    let startTime;

    switch (timeframe) {
      case '1h':
        startTime = new Date(now - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now - 24 * 60 * 60 * 1000);
    }

    return { $gte: startTime };
  }
}

export default SecurityLogger;