JS Chess Engine
My own custom chess engine in JS. I wrote the base: how the pieces move, the board structure, and most importantly, the position evaluation logic.

What's inside:
My evaluation: I implemented "prediction" logic in evaluatePosition—the engine doesn't just see a piece, but calculates what will happen if it's captured in response.

Algorithms: I implemented Negamax with alpha-beta pruning to keep the AI ​​from getting bogged down and calculate faster.

Quiescence: To prevent the bot from going crazy during trades, I added a roll-back function for captures.

SEE: Evaluating the safety of a square before a move.
