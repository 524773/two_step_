//---------------------------------------//
// Define experiment parameters.
//---------------------------------------//
// Define transition probabilities.
const trans_probs  = [0.7,0.3];         // [common, uncommon]
const trans_bounds = [0.6,0.8];         // bounds around common

// Define timing parameters.
const choice_duration = 10000;
const feedback_duration = 1200;

// Define randomization parameters.
const randomize_s1 = true;            // randomize left/right position of state 1 bandits
const randomize_s2 = true;            // randomize left/right position of state 2 bandits

function getPositionBasedOnTrial(trialNumber) {
    return trialNumber % 2 === 0 ? 'right' : 'left';  // Even trials get 'right', odd trials get 'left'
}
// Define quality assurance parameters.
var missed_threshold = 6;
var missed_responses = 0;

//---------------------------------------//
// Define stimulus features.
//---------------------------------------//
// The indices of the rocket and planet colors are mapped.
// That is, the first rocket will lead to the first planet
// under the common transition.

// Define stimulus constants.
const planet_colors = ['#5b7c65','#706081','#7f5d5d','#5f6f81'];
const rocket_colors = ['#48a782','#955db9','#a75248','#486ea7'];
const font_colors = ['#398667','#754198','#aa5349','#416598'];
const color_names = ['green','purple','red','blue'];

// Define stimulus assignments.
const mapping = jsPsych.randomization.shuffle([
    jsPsych.randomization.shuffle([0,1]),
    jsPsych.randomization.shuffle([2,3]),
]).flat();

// Define task stimuli.
const task_info = {
  planet_colors: mapping.slice(0,2).map(function(i) {return planet_colors[i]} ),
  font_colors: mapping.map(function(i) {return font_colors[i]} ),
  planet_names: mapping.slice(0,2).map(function(i) {return color_names[i]} ),
  rocket_colors: mapping.slice(2,4).map(function(i) {return rocket_colors[i]} ),
  rocket_names: mapping.slice(2,4).map(function(i) {return color_names[i]} ),
  aliens: jsPsych.randomization.shuffle([1,2,3,4]).map((j,i) => {
    return './img/aliens_svg/A'+j+'-'+color_names[mapping[i<2?0:1]]+'.svg'
  })
}
// Apply randomization to positions (for odd/even trials)
let state1Position = randomize_s1 ? getPositionBasedOnTrial(1) : 'left';  // Trial 1 for state 1
let state2Position = randomize_s2 ? getPositionBasedOnTrial(2) : 'left';  // Trial 2 for state 2

console.log(`State 1 Position: ${state1Position}`);
console.log(`State 2 Position: ${state2Position}`);
// Define practice stimuli.
const practice_info = {
  planet_colors: mapping.slice(2,4).map(function(i) {return planet_colors[i]} ),
  font_colors: mapping.map(function(i) {return font_colors[i]} ),
  planet_names: mapping.slice(2,4).map(function(i) {return color_names[i]} ),
  rocket_colors: mapping.slice(0,2).map(function(i) {return rocket_colors[i]} ),
  rocket_names: mapping.slice(0,2).map(function(i) {return color_names[i]} ),
  aliens: jsPsych.randomization.shuffle([1,2,3,4]).map((j,i) => {
    return './img/aliens_svg/P'+j+'-'+color_names[mapping[i<2?2:3]]+'.svg'
  })
}

// Define images to preload.
const preload_images = task_info['aliens'].concat(practice_info['aliens']);

//---------------------------------------//
// Define reward outcomes.
const drifts = [
  [0.6  , 0.51 , 0.387, 0.388],
  [0.6  , 0.49 , 0.376, 0.364],
  [0.278, 0.551, 0.545, 0.395]
];

// Define outcomes.
// Evaluate outcomes to define the trial-by-trial outcomes for each bandit.
const outcomes = [];
for (let i=0; i<drifts.length; i++) {
  outcomes.push( drifts[i].map(p => Math.random() < p ? 1 : 0) )
}

//---------------------------------------//
// Define transition probabilities.
//---------------------------------------//
// Generate the trial-by-trial state transitions (common or uncommon) using
// the transition probabilities defined above. The while loop ensures that
// the sequence contains a fraction of common transitions within bounds.

Math.seedrandom('trial_seed_123');

while (true) {

  // Generate transition events.
  var transitions = jsPsych.randomization.sampleWithReplacement([1,0], drifts.length, trans_probs);

  // Compute average.
  const avg = transitions.reduce(function(a,b){return a+b}, 0) / transitions.length;

  // Assert average transition probability close to 0.7.
  if (avg > trans_bounds[0] && avg < trans_bounds[1]) { break; }

}

//---------------------------------------//
// Define experiment timeline.
//---------------------------------------//

// Preallocate space.
var TWO_STEP_TASK = [];

// Iteratively generate trials.
for (let i=0; i < outcomes.length; i++){

  // Define trial.
  const trial = {
    type: jsPsychTwoStepTrial,
    transition: transitions[i],
    outcomes:  outcomes[i],
    rocket_colors: task_info.rocket_colors,
    planet_colors: task_info.planet_colors,
    aliens: task_info.aliens,
    choice_duration: choice_duration,
    feedback_duration: feedback_duration,
    randomize_s1: randomize_s1,
    randomize_s2: randomize_s2,
    data: {
      trial: i+1,
      drifts: drifts[i],
    },
    on_finish: function(data) {

      // Store number of browser interactions
      data.browser_interactions = jsPsych.data.getInteractionData().filter({trial: data.trial_index}).count();

      // Evaluate missing data
      if ( data.state_1_choice == null || data.state_2_choice == null ) {

        // Set missing data to true.
        data.missing = true;

        // Increment counter. Check if experiment should end.
        missed_responses++;
        if (missed_responses >= missed_threshold) {
          jsPsych.endExperiment();
        }

      } else {

        // Set missing data to false.
        data.missing = false;

      }

    }
  }

  // Define looping node.
  const trial_node = {
    timeline: [trial],
    loop_function: function(data) {
      return data.values()[0].missing;
    }
  }

  // Append trial.
  TWO_STEP_TASK.push(trial_node)

}

//---------------------------------------//
// Define transition screens.
//---------------------------------------//

// Define ready screen.
var READY_0 = {
  type: jsPsychTwoStepInstructions,
  pages: [
    "<p>すばらしい。あなたは練習を終了しました。</p><p>We'll get started with the real game now.</p>",
    "<p>In the real game, you will see new planets, aliens, and rocket ships.</p><p>However, the rules of the game <b>have not changed</b>.</p>",
    "Get ready to begin <b>Block 1/2</b>. It will take ~8 minutes.<br>Press next when you're ready to start.",
  ]
}

var READY_01 = {
  type: jsPsychTwoStepInstructions,
  pages: [
    "<p>Here is a gain part.</p><p>We had better select a germs.</p>",
    "<p>This means that avoiding junk is useful.</p><p>The rules of the game <b>have not changed</b>.</p>",
    "Get ready to begin <b>Block 1/2</b>. It is Ok?",
  ]
}

var READY_02 = {
  type: jsPsychTwoStepInstructions,
  pages: [
    "Here is a lose part.</p>",
    "Take a break for a few moments and press any button when you are ready to continue.",
    "Get ready to begin <b>Block 2/2</b>. It will take ~8 minutes.<br>Press next when you're ready to start.",
  ]
}

//---------------------------------------//
// Define end of experiment screens.
//---------------------------------------//

// Define finish screen.
const instructions_04 = {
  type: jsPsychTwoStepInstructions,
  pages: [
    "<p>Great job! You've finished the task.</p><p>Before you finish, we have a couple of short questions for you.</p>",
  ]
}

// Define comprehension check.
const quiz_04 = {
  type: jsPsychTwoStepComprehension,
  prompts: [
    `Which rocket ship went mostly to the <b><font color='${task_info.font_colors[0]}'>${task_info.planet_names[0]}</font></b> planet?`,
    `Which rocket ship went mostly to the <b><font color='${task_info.font_colors[1]}'>${task_info.planet_names[1]}</font></b> planet?`,
  ],
  options: [
    task_info.rocket_names,
    task_info.rocket_names,
  ],
  correct: [
    task_info.rocket_names[0],
    task_info.rocket_names[1],
  ]
}

var FINISHED = [
  instructions_04,
  quiz_04
];
