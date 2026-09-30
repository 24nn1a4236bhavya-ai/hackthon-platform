# Judging & Score Normalization Specification

## 1. The Core Hackathon Judging Problem

In typical hackathons, projects cannot all be evaluated by the same panel of judges due to time and scaling constraints. Instead, projects are assigned to subsets of judges. This introduces severe statistical biases:

1. **Strictness Bias (Mean Discrepancy)**:
   - *Judge Alpha* is harsh, awarding an average score of $5.5 / 10$.
   - *Judge Beta* is lenient, awarding an average score of $9.0 / 10$.
   - An identical project evaluated by Judge Alpha would lose to an inferior project evaluated by Judge Beta under raw average scoring.

2. **Dispersion Bias (Variance Discrepancy)**:
   - *Judge Gamma* scores in a tight band ($7.8 - 8.2$, standard deviation $\approx 0.2$).
   - *Judge Delta* scores across the entire spectrum ($2.0 - 10.0$, standard deviation $\approx 3.0$).
   - Judge Delta exerts 15x more influence over rankings than Judge Gamma.

To guarantee a fair, meritocratic competition, this platform implements **Statistical Z-Score Normalization** alongside configurable Olympic Trimmed-Mean scoring.

---

## 2. Mathematical Formulation

### 2.1 Weighted Rubric Raw Score

For an evaluation $e$ submitted by judge $j$ for project $p$:

$$\text{RawScore}(j, p) = \sum_{c=1}^{C} \left( \frac{\text{Score}_{j,p,c}}{\text{MaxPoints}_c} \times \text{Weight}_c \right) \times 100$$

Where:
- $C$ is the total number of criteria in the active rubric.
- $\text{Score}_{j,p,c}$ is the points awarded by judge $j$ on criterion $c$.
- $\text{MaxPoints}_c$ is the maximum points attainable on criterion $c$.
- $\text{Weight}_c$ is the relative normalized weight ($\sum \text{Weight}_c = 1.0$).
- Raw scores are mapped to a standardized scale of $0.0 \dots 100.0$.

---

### 2.2 Z-Score Standardization per Judge

For every judge $j$ who has submitted $N_j$ evaluations:

1. Compute Judge Mean ($\mu_j$):
   $$\mu_j = \frac{1}{N_j} \sum_{k=1}^{N_j} \text{RawScore}(j, p_k)$$

2. Compute Judge Sample Standard Deviation ($\sigma_j$):
   $$\sigma_j = \sqrt{\frac{1}{N_j - 1} \sum_{k=1}^{N_j} \left( \text{RawScore}(j, p_k) - \mu_j \right)^2}$$

3. Compute Z-Score for evaluation $(j, p)$:
   $$Z_{j, p} = \begin{cases}
     \frac{\text{RawScore}(j, p) - \mu_j}{\sigma_j}, & \text{if } \sigma_j > 10^{-6} \text{ and } N_j \ge 2 \\
     0.0, & \text{otherwise}
   \end{cases}$$

---

### 2.3 Rescaling to Global Competition Distribution

Raw Z-scores have a mean of 0 and standard deviation of 1. To render them human-interpretable on the original 100-point scale:

1. Compute Global Hackathon Score Mean ($\mu_{\text{global}}$) and Standard Deviation ($\sigma_{\text{global}}$) across all evaluations. If $\sigma_{\text{global}} < 1.0$, a default spread of $\sigma = 15.0$ and $\mu = 75.0$ is utilized as standard rubric anchors.

2. Calculate Normalized Score:
   $$\text{NormalizedScore}(j, p) = \text{Clamp}\Big( \mu_{\text{global}} + \left( Z_{j, p} \times \sigma_{\text{global}} \right), \ 0.0, \ 100.0 \Big)$$

3. Project Final Score:
   The project's aggregate normalized score is the arithmetic mean across all its evaluations:
   $$\text{FinalScore}(p) = \frac{1}{|J_p|} \sum_{j \in J_p} \text{NormalizedScore}(j, p)$$

---

### 2.4 Trimmed-Mean (Olympic) Scoring

When a project receives 3 or more evaluations, the platform supports an optional **Trimmed Mean** mode:
- The highest evaluation score and lowest evaluation score for project $p$ are excluded.
- The average is computed over the remaining intermediate evaluations:

$$\text{TrimmedScore}(p) = \frac{1}{|J_p| - 2} \sum_{j \in J_p \setminus \{\min, \max\}} \text{Score}(j, p)$$

---

## 3. Edge Case Mitigation Strategies

| Scenario | Edge Condition | Platform Fallback Strategy |
| :--- | :--- | :--- |
| **Single Submission** | Judge has evaluated only $N_j = 1$ project. | Sample standard deviation is undefined ($N_j - 1 = 0$). Score reverts gracefully to RawScore without skewing rankings. |
| **Identical Scores** | Judge gives identical scores to all projects ($\sigma_j = 0$). | Z-score would divide by zero. Handled by falling back to $Z_{j, p} = 0.0$, mapping the score cleanly to $\mu_{\text{global}}$. |
| **Uneven Assignment Count** | Project A has 3 judges, Project B has 2 judges. | Normalized scores eliminate volume bias because individual judge means are neutralized before averaging. |
| **Ties** | Two projects have identical final normalized scores. | Tie-breaker hierarchy: <br>1. Highest individual criterion score on "Technical Complexity"<br>2. Highest community vote count<br>3. Earliest submission timestamp. |

---

## 4. Automated Round-Robin Judge Assignment

The platform includes an automated judge assignment engine with the following guarantees:

1. **Load Balancing**: Distributes submitted projects across all available judges such that every project receives exactly $K$ judges (configurable, default $K=3$).
2. **Judge Workload Balancing**: Discrepancy in assigned project count between any two judges does not exceed $\pm 1$.
3. **Conflict of Interest Avoidance**:
   - Judges who are also registered participants cannot be assigned to their own team's project.
   - Prevents assignment to projects belonging to teammates.
4. **Deterministic Randomization**: Assignments can be previewed by organizers before committing to the database.
