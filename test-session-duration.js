#!/usr/bin/env node

// Simple test for session duration calculation
function calculateSessionDuration(sessionStart, sessionEnd) {
  if (!sessionStart) {
    return { 
      durationMinutes: 0, 
      durationHours: 0, 
      formattedDuration: 'Unknown duration (session start not tracked)' 
    };
  }
  
  try {
    const startTime = new Date(sessionStart);
    const durationMs = sessionEnd.getTime() - startTime.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
    
    // Format duration nicely
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    let formattedDuration = '';
    if (hours > 0) {
      formattedDuration += `${hours}h`;
    }
    if (minutes > 0) {
      if (hours > 0) formattedDuration += ' ';
      formattedDuration += `${minutes}m`;
    }
    if (formattedDuration === '') {
      formattedDuration = '< 1m';
    }
    
    return { durationMinutes, durationHours, formattedDuration };
  } catch {
    return { 
      durationMinutes: 0, 
      durationHours: 0, 
      formattedDuration: 'Invalid session start time' 
    };
  }
}

// Test cases
console.log('🧪 Testing Session Duration Calculation\n');

// Test 1: 30 minutes
let start = new Date('2025-06-26T10:00:00.000Z');
let end = new Date('2025-06-26T10:30:00.000Z');
let result = calculateSessionDuration(start.toISOString(), end);
console.log(`Test 1 (30 minutes): ${result.formattedDuration} (${result.durationMinutes} min, ${result.durationHours}h)`);

// Test 2: 1 hour 15 minutes
start = new Date('2025-06-26T10:00:00.000Z');
end = new Date('2025-06-26T11:15:00.000Z');
result = calculateSessionDuration(start.toISOString(), end);
console.log(`Test 2 (1h 15m): ${result.formattedDuration} (${result.durationMinutes} min, ${result.durationHours}h)`);

// Test 3: 2.5 hours
start = new Date('2025-06-26T10:00:00.000Z');
end = new Date('2025-06-26T12:30:00.000Z');
result = calculateSessionDuration(start.toISOString(), end);
console.log(`Test 3 (2h 30m): ${result.formattedDuration} (${result.durationMinutes} min, ${result.durationHours}h)`);

// Test 4: Less than 1 minute
start = new Date('2025-06-26T10:00:00.000Z');
end = new Date('2025-06-26T10:00:30.000Z');
result = calculateSessionDuration(start.toISOString(), end);
console.log(`Test 4 (30 seconds): ${result.formattedDuration} (${result.durationMinutes} min, ${result.durationHours}h)`);

// Test 5: No session start
result = calculateSessionDuration(null, end);
console.log(`Test 5 (null start): ${result.formattedDuration}`);

// Test 6: Invalid session start
result = calculateSessionDuration('invalid-date', end);
console.log(`Test 6 (invalid start): ${result.formattedDuration}`);

console.log('\n✅ Session duration calculation tests completed!');