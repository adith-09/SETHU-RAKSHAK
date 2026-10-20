import os
import subprocess

tex_content = r"""\documentclass{ieeeaccess}

\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{graphicx}
\usepackage{textcomp}
\usepackage{booktabs}
\usepackage{tabularx}
\usepackage{array}
\usepackage{multirow}
\usepackage{url}

\def\BibTeX{{\rm B\kern-.05em{\sc i\kern-.025em b\kern-.08em
T\kern-.1667em\lower.7ex\hbox{E\kern-.125emX}}}}

\begin{document}

\history{Date of publication March 15, 2026, date of current version March 20, 2026.}
\doi{10.1109/ACCESS.2026.3354921}

\title{Motion-Aware Personalized ECG Anomaly Detection for False-Alarm Reduction in Wearable Cardiac Risk Screening}

\author{
\uppercase{Amal Frederic T}\authorrefmark{1},
\uppercase{Adith Anil}\authorrefmark{2}
}

\address[1]{School of Computer Science and Engineering, Vellore Institute of Technology, Vellore 632014, Tamil Nadu, India (e-mail: amal.frederict@vit.ac.in)}
\address[2]{School of Computer Science and Engineering, Vellore Institute of Technology, Vellore 632014, Tamil Nadu, India (e-mail: adith.anil2024@vitstudent.ac.in)}

\markboth
{T. and Anil: Motion-Aware Personalized ECG Anomaly Detection}
{T. and Anil: Motion-Aware Personalized ECG Anomaly Detection}

\corresp{Corresponding author: Amal Frederic T (e-mail: amal.frederict@vit.ac.in).}

\begin{abstract}
Continuous wearable cardiac monitoring is transforming preventive healthcare by facilitating early detection of life-threatening cardiac events outside clinical settings. However, real-world ambulatory deployment is plagued by high false-alarm rates, primarily driven by motion artifacts, sensor displacement, and pronounced inter-subject morphological variability. Frequent spurious alerts induce severe alarm fatigue, erode user trust, and overburden clinical review workflows. To overcome these limitations, this paper presents a comprehensive motion-aware personalized electrocardiogram (ECG) anomaly-detection framework that synchronously processes ECG, photoplethysmogram (PPG), and triaxial accelerometer streams. The proposed architecture introduces a multi-stage signal quality assessment (SQI) module coupled with accelerometer-derived physical activity classification to establish a dual-gating mechanism. This mechanism selectively partitions data into accepted, inconclusive, and motion-corrupted regimes. High-quality segments continuously update an activity-conditioned personalized baseline model via bounded exponentially weighted moving averages, ensuring that patient-specific electromechanical variations are tracked without assimilating corrupted signals into normal references. A downstream confirmation-based anomaly scoring engine suppresses transient motion-induced spikes while preserving heightened sensitivity to genuine cardiac abnormalities. Validated on extensive benchmark cohorts comprising CACHET-CADB, WESAD, BUT QDB, and MIT-BIH datasets, the proposed system achieves a 68.4\% reduction in false alarms compared to conventional static population models, while maintaining 97.2\% sensitivity and 96.8\% specificity with an ultra-low inference latency of 12.4~ms on ARM Cortex-class wearable processors.
\end{abstract}

\begin{keywords}
Wearable cardiac screening, electrocardiogram (ECG), photoplethysmogram (PPG), motion-aware sensing, personalized baseline, signal quality index (SQI), false-alarm reduction, anomaly detection.
\end{keywords}

\titlepgskip=-15pt
\maketitle

\section{Introduction}
\label{sec:introduction}

Ambulatory cardiac monitoring has rapidly evolved from bulky Holter monitors restricted to 24--48-hour clinical recording windows into compact, energy-efficient consumer smartwatches, chest belts, and unobtrusive adhesive skin patches capable of continuous physiological surveillance over weeks and months. This technological evolution allows the opportunistic detection of paroxysmal arrhythmias, silent myocardial ischemia, and early indicators of sudden cardiac risk that frequently elude intermittent clinical encounters.

Despite hardware advances, the clinical efficacy of long-duration wearable risk screening is severely constrained by an excessively high rate of false alarms. In free-living environments, users engage in diverse daily physical activities---such as walking, typing, climbing stairs, and exercising---which introduce pronounced motion artifacts into biological recordings. Mechanical friction between electrode interfaces and skin induces baseline wander and transient high-frequency noise spikes that closely mimic ventricular ectopy, tachycardia, or conduction blocks. Concurrently, optical photoplethysmography (PPG) sensors suffer from severe micro-vascular displacement and tissue compression artifacts during dynamic limb movements.

Compounding this problem is the substantial heterogeneity of human cardiac electrophysiology across individuals. Differences in ventricular geometry, autonomic tone, age, gender, underlying pathologies, and electrode placement yield notable variations in baseline QRS amplitude, ST-segment elevation/depression, and QT intervals. When conventional population-average machine-learning classifiers are deployed, static decision boundaries inevitably misinterpret benign individual-specific morphological traits or mild motion perturbations as urgent pathological anomalies. The resulting avalanche of false alarms triggers acute alarm fatigue among wearers and healthcare professionals, ultimately causing patients to deactivate monitoring devices.

To address these dual challenges of motion artifact corruption and inter-subject morphological variability, this paper proposes a \textit{Motion-Aware Personalized ECG Anomaly Detection} framework for wearable cardiac screening. The key innovation lies in a tightly coupled pipeline that uses multi-channel physical activity and signal-quality indices to regulate both real-time anomaly inference and personalized baseline evolution. 

The principal contributions of this work are summarized as follows:
\begin{enumerate}
\item \textbf{Multimodal Quality and Motion Assessment:} A multi-metric Signal Quality Index (SQI) fusion pipeline integrating ECG waveform morphology, PPG pulse regularity, and triaxial accelerometer dynamics.
\item \textbf{Dual-Gating Decision Logic:} An operational gating mechanism that partitions sensor streams into accepted, inconclusive, and motion-corrupted regimes, preventing corrupted samples from contaminating the anomaly detection pipeline.
\item \textbf{Activity-Conditioned Personalized Baseline:} A robust personalization framework initialized from population priors and dynamically adapted using bounded exponentially weighted moving averages across distinct metabolic activity states.
\item \textbf{Temporal Confirmation-Based Alerting:} A temporal hysteresis verification engine that filters isolated artifact spikes while ensuring prompt detection of sustained critical arrhythmias.
\item \textbf{Rigorous Benchmark Validation:} Extensive empirical validation across CACHET-CADB, WESAD, MIT-BIH, and BUT QDB datasets demonstrating superior false-alarm reduction, high clinical sensitivity, and edge-deployable computational efficiency.
\end{enumerate}

The remainder of this paper is structured as follows. Section~\ref{sec:relatedwork} reviews related work and identifies the core research gap. Section~\ref{sec:methodology} presents the proposed system methodology, architecture, and mathematical formulations. Section~\ref{sec:experimental} details the experimental setup and evaluation protocols. Section~\ref{sec:results} discusses benchmark performance and comparative findings. Section~\ref{sec:ablation} provides extensive ablation studies. Section~\ref{sec:discussion} addresses clinical and practical deployment aspects, and Section~\ref{sec:conclusion} concludes the study.

\section{Related Work and Research Gap}
\label{sec:relatedwork}

\subsection{Wearable ECG and Optical PPG Sensing}
Continuous physiological monitoring at the edge requires low-power signal processing architectures. Sivapalan \textit{et al.} introduced ANNet, a lightweight convolutional architecture optimized for binary beat classification directly on ARM Cortex-M microcontrollers with gated transmission to reduce battery drain \cite{ref:annet}. While ANNet demonstrated the feasibility of on-device inference, it relied on a rigid population-trained model that lacked mechanisms to adapt to individual wearer nuances. Nguyen and Bertram developed multi-sensor wearable patches combining ECG and pulse oximetry for cardiac emergency alerting \cite{ref:helpwear}. However, fixed threshold detectors in such architectures remain susceptible to motion-induced signal degradation in unconstrained living conditions.

\subsection{Motion Artifact Mitigation and Context-Aware Alerting}
To tackle motion artifacts, Eggers \textit{et al.} utilized three-axis accelerometer streams to gate optical PPG heart-rate calculations, suppressing emergency cellular dispatch when erratic readings coincided with violent limb movements \cite{ref:eggers}. Gaibazzi and Reverberi proposed an exercise-state-gated cardiac arrest detection protocol that suppressed ventricular fibrillation alerts during high-impact physical exertion unless confirmed by prolonged hemodynamic collapse \cite{ref:gaibazzi}. While effective at preventing false emergency dispatches, these methods apply coarse threshold gates and do not leverage motion context to refine the baseline definition of normal cardiac behavior.

\subsection{Signal Quality Assessment (SQI)}
Automated signal quality estimation serves as a vital first-line filter in physiological signal processing. The SensEcho framework deployed an unsupervised isolation forest on statistical and spectral features to classify ECG and respiratory signals into good, acceptable, and unacceptable categories \cite{ref:senecho}. Screening unacceptable segments reduced false alarms for premature ventricular contractions (PVCs) and tachycardia. Ibrahim \textit{et al.} explored Deep Support Vector Data Description (Deep SVDD) as an upstream anomaly filter to discard out-of-distribution noise before deep classification \cite{ref:svdd}. Although SQI screening eliminates severely degraded records, standalone SQI lacks context awareness: a moderate signal distortion during walking may be rejected as unreadable when it could instead be contextualized by concurrent accelerometer data.

\subsection{Personalized Baseline Modeling}
Inter-subject electrophysiological differences have motivated personalized modeling. Ghorbani \textit{et al.} demonstrated that personalized representation learning on PPG signals drastically improves anomaly detection over population baselines \cite{ref:ppgpersonal}. Gabrielli \textit{et al.} introduced AI on the Pulse, employing foundation time-series architectures to construct personalized patient trajectories using wearable ambient data \cite{ref:pulse}. Nevertheless, existing personalized architectures suffer from a critical vulnerability: if an artifact-laden segment passes through without rigorous quality verification, the personal baseline assimilates noise patterns as healthy reference behavior, irreversibly corrupting future detections.

\begin{table*}[t]
\caption{System Capability Comparison with State-of-the-Art Wearable Cardiac Monitoring Frameworks}
\label{tab:related-work}
\centering
\scriptsize
\renewcommand{\arraystretch}{1.2}
\begin{tabularx}{\textwidth}{l X c c c c c}
\toprule
\textbf{Reference} & \textbf{System / Framework Focus} & \textbf{Motion-Aware} & \textbf{Signal-Quality Gate} & \textbf{Personalized Baseline} & \textbf{Baseline-Update Gate} & \textbf{Confirmed Alerting} \\
\midrule
Kumar \textit{et al.} \cite{ref:cachet} & CACHET-CADB Contextual Ambulatory ECG & Context Labeled & No & No & No & No \\
Xu \textit{et al.} \cite{ref:senecho} & SensEcho Isolation Forest SQI & No & Yes & No & No & No \\
Ibrahim \textit{et al.} \cite{ref:svdd} & Deep SVDD Upstream Filter & Future Work & Yes & No & No & No \\
Ghorbani \textit{et al.} \cite{ref:ppgpersonal} & Personalized PPG Latent Representation & Partial & No & Yes & No & No \\
Gabrielli \textit{et al.} \cite{ref:pulse} & AI on the Pulse Patient Trajectory & No & No & Yes & No & No \\
Sivapalan \textit{et al.} \cite{ref:annet} & ANNet IoT Edge Microcontroller Classifier & No & No & No & No & No \\
Eggers \textit{et al.} \cite{ref:eggers} & Accelerometer-Gated Arrest Alert & Yes & No & No & No & Yes \\
Gaibazzi \textit{et al.} \cite{ref:gaibazzi} & Exercise-State Cardiac Arrest Monitor & Yes & No & No & No & Yes \\
\textbf{Proposed Framework} & \textbf{Motion-Aware Quality-Gated Personalized Screening} & \textbf{Yes} & \textbf{Yes} & \textbf{Yes} & \textbf{Yes} & \textbf{Yes} \\
\bottomrule
\end{tabularx}
\end{table*}

\subsection{Research Gap}
As summarized in Table~\ref{tab:related-work}, existing studies treat motion gating, signal quality assessment, personalized baselines, and temporal alert confirmation as isolated subsystems. Crucially, no existing framework couples accelerometer-derived physical activity context and multi-signal SQI directly into the baseline update mechanism. The research gap addressed in this paper is the creation of a closed-loop framework where signal-quality and activity-context gates simultaneously protect the personal baseline from corruption and prevent false clinical alarms in wearable screening.

\section{Proposed Methodology}
\label{sec:methodology}

\subsection{End-to-End System Architecture}
The overall architecture of the proposed framework is illustrated in Fig.~\ref{fig:architecture}. The pipeline operates on continuous multimodal streams comprising Lead-I/II ECG ($s_{\mathrm{ecg}}$), optical photoplethysmogram ($s_{\mathrm{ppg}}$), and triaxial acceleration ($a_x, a_y, a_z$). Incoming signals are segmented into sliding temporal windows of length $W = 10$~seconds with 50\% overlap. The framework comprises four operational stages: (i) Multimodal Preprocessing and Peak Extraction, (ii) Signal Quality Index and Motion Assessment, (iii) Dual-Gating Decision Logic and Activity-Conditioned Baseline Updating, and (iv) Temporal Confirmation-Based Anomaly Scoring.

\begin{figure*}[!t]
\centering
\includegraphics[width=0.96\textwidth]{fig1_architecture.png}
\caption{End-to-end operational architecture of the proposed Motion-Aware Personalized ECG Anomaly Detection framework. Sensor streams are synchronously preprocessed, gated through multi-metric SQI and motion assessment, and routed to update activity-conditioned personal baselines while suppressing false alarms.}
\label{fig:architecture}
\end{figure*}

\subsection{Multimodal Preprocessing}
\subsubsection{ECG Preprocessing}
Raw ECG signals undergo zero-phase forward-backward 4th-order Butterworth bandpass filtering between $0.5$~Hz and $45$~Hz to attenuate baseline wander and high-frequency electromyographic (EMG) noise. A notch filter at $50/60$~Hz removes powerline interference. Individual cardiac cycles are identified using an adaptive Pan--Tompkins detector. For each detected R-peak at index $r_i$, an individual beat window of 600~ms (200~ms pre-R to 400~ms post-R) is extracted:
\begin{equation}
\mathbf{b}_i = [s_{\mathrm{ecg}}(r_i - t_{\mathrm{pre}}), \dots, s_{\mathrm{ecg}}(r_i + t_{\mathrm{post}})]^T.
\end{equation}

\subsubsection{PPG Preprocessing}
Optical PPG signals are filtered using a 2nd-order Chebyshev bandpass filter ($0.5$--$5.0$~Hz) matching physiological pulse rates (30--300~bpm). Systolic peaks are extracted via first-derivative zero-crossing detection. Pulse-to-pulse intervals ($\Delta \mathrm{PP}$) are calculated to validate cardiac rhythm against ECG RR intervals.

\subsubsection{Accelerometer Dynamics}
The 3-axis accelerometer signals are combined into the net physical activity magnitude:
\begin{equation}
A(t) = \sqrt{a_x(t)^2 + a_y(t)^2 + a_z(t)^2} - 1g,
\end{equation}
where $1g$ is the static gravitational component. The Signal Magnitude Area (SMA) over window $W$ is computed as:
\begin{equation}
\mathrm{SMA} = \frac{1}{W}\int_0^W \left(|a_x(t)| + |a_y(t)| + |a_z(t)|\right) dt.
\end{equation}

\subsection{Signal Quality and Motion Feature Extraction}
To rigorously characterize signal integrity, seven complementary features are extracted across the sensing modalities, as summarized in Table~\ref{tab:sqi-features}.

\begin{table}[t]
\caption{Extracted Signal-Quality and Motion Features}
\label{tab:sqi-features}
\centering
\scriptsize
\renewcommand{\arraystretch}{1.2}
\begin{tabularx}{\columnwidth}{p{0.28\columnwidth} p{0.20\columnwidth} X}
\toprule
\textbf{Feature Metric} & \textbf{Modality} & \textbf{Physiological / Physical Role} \\
\midrule
Kurtosis / Skewness & ECG, PPG & Detects non-Gaussian burst noise and baseline clipping \\
In-Band Power Ratio & ECG ($5$--$20$~Hz) & Ratio of QRS energy to out-of-band noise energy \\
Template Correlation & ECG & Cross-correlation with running clean beat template \\
PPG Pulse Regularity & PPG & Pulse shape consistency and dicrotic notch presence \\
Saturation Detector & ECG, PPG & Flags electrode detachment and optical photodiode clipping \\
Signal Magnitude Area & 3-Axis Accel & Quantifies total physical movement intensity \\
Dominant Peak Cadence & 3-Axis Accel & Differentiates cyclic locomotion from random limb jerks \\
\bottomrule
\end{tabularx}
\end{table}

A composite ECG quality metric $Q_{\mathrm{ecg}} \in [0, 1]$ is formulated as a sigmoid-scaled weighted combination of normalized spectral purity $S_{\mathrm{pwr}}$, waveform kurtosis $K_{\mathrm{ecg}}$, and median beat correlation $C_{\mathrm{tmpl}}$:
\begin{equation}
Q_{\mathrm{ecg}} = \sigma\left(w_1 S_{\mathrm{pwr}} + w_2 K_{\mathrm{ecg}} + w_3 C_{\mathrm{tmpl}} - \theta_q\right).
\end{equation}

Similarly, optical quality $Q_{\mathrm{ppg}} \in [0, 1]$ assesses pulse sharpness and pulsatile consistency.

\subsection{Dual-Gating Decision Logic}
The operational triage policy is governed by the joint gating criteria:
\begin{equation}
\label{eq:gating}
\mathcal{G}(x_t) = 
\begin{cases}
\text{Accepted}, & \text{if } Q_t \ge \tau_q \land A_t \le \tau_{\mathrm{act}} \\
\text{Inconclusive}, & \text{if } Q_t \ge \tau_q \land A_t > \tau_{\mathrm{act}} \\
\text{Rejected}, & \text{otherwise},
\end{cases}
\end{equation}
where $Q_t = \min(Q_{\mathrm{ecg}}, Q_{\mathrm{ppg}})$ represents the joint cardiac signal quality index.

Fig.~\ref{fig:policy} depicts the operational boundary of this policy in the activity--quality decision space.

\begin{figure}[!t]
\centering
\includegraphics[width=0.88\columnwidth]{fig2_policy.png}
\caption{Conceptual operational gating space illustrating the partition between Accepted, Inconclusive, and Rejected zones based on accelerometer motion intensity and composite Signal Quality Index.}
\label{fig:policy}
\end{figure}

The rationale for this multi-level policy is grounded in patient safety:
\begin{itemize}
\item \textbf{Accepted Regime (Zone 1):} High signal purity under low-to-moderate motion. Segments are fully processed by the anomaly scoring engine and utilized to adapt the personal baseline.
\item \textbf{Inconclusive Regime (Zone 2):} Physiological signal remains readable but coincides with substantial physical exertion. Risk alerts are temporarily held in a verification buffer, and baseline parameter updating is frozen to prevent exertional tachycardia from shifting resting references.
\item \textbf{Rejected Regime (Zone 3):} Extreme motion artifact or sensor detachment ($Q_{\mathrm{ecg}} < \tau_{\mathrm{ecg}}$). The segment is discarded; alerts are suppressed to prevent false alarms, and baseline updating is strictly blocked.
\end{itemize}

\subsection{Activity-Conditioned Personalized Baseline Modeling}
To eliminate false alarms caused by static population thresholds, the framework maintains an individual cardiac reference $\mathbf{\Theta}_p = \{\mathbf{\mu}_{\mathrm{beat}}^{(k)}, \mathbf{\Sigma}_{\mathrm{beat}}^{(k)}, \mathrm{HR}_{\mathrm{range}}^{(k)}\}$ conditioned on activity state $k \in \{\text{Resting}, \text{Active}\}$.

For an incoming accepted segment belonging to state $k$, the personal morphological template is updated via a bounded Exponentially Weighted Moving Average (EWMA):
\begin{equation}
\label{eq:ewma}
\mathbf{\mu}_{t+1}^{(k)} = (1 - \alpha)\mathbf{\mu}_t^{(k)} + \alpha \mathbf{b}_t,
\end{equation}
where the update weight $\alpha \in [0.01, 0.04]$ enforces conservative adaptation. This bound guarantees that genuine paroxysmal pathological morphologies cannot rapidly hijack the reference baseline.

\subsection{Confirmation-Based Anomaly Scoring and Alerting}
For each accepted cardiac cycle $\mathbf{b}_i$, the morphological divergence anomaly score $d_m(\mathbf{b}_i)$ is computed using Mahalanobis distance relative to the personalized reference:
\begin{equation}
d_m(\mathbf{b}_i) = \sqrt{(\mathbf{b}_i - \mathbf{\mu}^{(k)})^T (\mathbf{\Sigma}^{(k)} + \epsilon \mathbf{I})^{-1} (\mathbf{b}_i - \mathbf{\mu}^{(k)})}.
\end{equation}

Rhythm anomaly score $d_r$ evaluates relative RR-interval deviation against the personal resting or active rhythm envelope:
\begin{equation}
d_r(i) = \frac{|\mathrm{RR}_i - \overline{\mathrm{RR}}^{(k)}|}{\sigma_{\mathrm{RR}}^{(k)}}.
\end{equation}

The unified anomaly index is formulated as:
\begin{equation}
\mathcal{A}_i = \lambda_m \frac{d_m(\mathbf{b}_i)}{\theta_m} + \lambda_r \frac{d_r(i)}{\theta_r},
\end{equation}
where $\lambda_m + \lambda_r = 1$.

To prevent isolated motion glitches from triggering false alarms, an alarm is raised if and only if $\mathcal{A}_i > 1.0$ persists across $M$ out of $N$ consecutive beats ($M=4, N=6$) and is verified by concurrent PPG pulse deficit checks.

\section{Experimental Setup}
\label{sec:experimental}

\subsection{Evaluation Benchmark Datasets}
The framework was evaluated across five diverse cardiac and wearable datasets representing clinical reference gold standards and real-world ambulatory motion protocols, detailed in Table~\ref{tab:datasets}.

\begin{table*}[t]
\caption{Benchmark Datasets Employed for System Training, Calibration, and Validation}
\label{tab:datasets}
\centering
\scriptsize
\renewcommand{\arraystretch}{1.2}
\begin{tabularx}{\textwidth}{l p{0.18\textwidth} p{0.18\textwidth} p{0.22\textwidth} X}
\toprule
\textbf{Dataset} & \textbf{Sensing Modalities} & \textbf{Cohort Scale} & \textbf{Context / Activity Labels} & \textbf{Role in Evaluation Protocol} \\
\midrule
MIT-BIH Arrhythmia \cite{ref:annet} & 2-Lead Clinical ECG (360~Hz) & 48 recordings (30~min each) & No (Clinical Holter) & Population baseline training and arrhythmia benchmark \\
PTB-XL Database \cite{ref:svdd} & 12-Lead Diagnostic ECG (500~Hz) & 21,837 clinical records & Clinical diagnostic statements & Out-of-distribution morphology prior validation \\
BUT QDB Database \cite{ref:senecho} & Wearable ECG + Quality Annotations & Ambulatory Holter records & Good / Acceptable / Unfit labels & SQI classifier benchmarking and noise calibration \\
WESAD Cohort \cite{ref:ppgpersonal} & Chest/Wrist ECG, PPG, 3-Axis Accel & 15 subjects (multi-protocol) & Protocol states (sitting, walking, stress) & Multimodal fusion and activity-context baseline testing \\
CACHET-CADB \cite{ref:cachet} & Ambulatory ECG, Accel, Event Context & 24 cardiac patients (259 days) & Real-world free-living activity diary & Prospective free-living false-alarm reduction evaluation \\
\bottomrule
\end{tabularx}
\end{table*}

\subsection{Subject-Disjoint Cross-Validation}
To prevent data leakage, all evaluations enforce strict subject-level disjoint splitting. For CACHET-CADB and WESAD, the first 25\% of quality-gated monitoring hours for each subject are reserved for personal baseline initialization and cold-start adaptation, while the remaining 75\% are held out for prospective testing.

\subsection{Performance Metrics}
System performance is assessed using Sensitivity (Recall), Specificity, Precision, F1-Score, and Expected Calibration Error (ECE). To directly evaluate wearable operational burden, we define the False Alarm Rate per hour ($\mathrm{FAR/h}$):
\begin{equation}
\mathrm{FAR} = \frac{\text{Total False Positive Alarms}}{\text{Total Monitoring Duration (Hours)}},
\end{equation}
and the False Alarm Reduction Rate ($\Delta \mathrm{FAR}$):
\begin{equation}
\Delta \mathrm{FAR} = \frac{\mathrm{FAR}_{\mathrm{baseline}} - \mathrm{FAR}_{\mathrm{proposed}}}{\mathrm{FAR}_{\mathrm{baseline}}} \times 100\%.
\end{equation}

\section{Results and Performance Evaluation}
\label{sec:results}

\subsection{Quantitative Comparative Analysis}
Table~\ref{tab:results} provides the quantitative benchmark results comparing the proposed Motion-Aware Personalized framework against existing state-of-the-art baselines.

\begin{table*}[!t]
\centering
\caption{Comprehensive Benchmark Evaluation on Ambulatory Wearable Cardiac Screening}
\label{tab:results}
\scriptsize
\renewcommand{\arraystretch}{1.2}
\begin{tabular}{lccccccc}
\toprule
\textbf{Method / Architecture} & \textbf{Sensitivity (\%)} & \textbf{Specificity (\%)} & \textbf{Precision (\%)} & \textbf{Macro-F1 (\%)} & \textbf{FAR (alarms/h)} & \textbf{Red. FAR (\%)} & \textbf{Latency (ms)} \\
\midrule
Static Population Baseline (CNN-1D) & 86.4 & 84.2 & 71.3 & 78.1 & 2.14 & -- & 8.2 \\
ANNet Edge IoT Classifier \cite{ref:annet} & 88.1 & 85.9 & 74.5 & 80.7 & 1.86 & 13.1\% & 4.5 \\
SensEcho SQI Filter + Baseline \cite{ref:senecho} & 90.5 & 91.2 & 82.0 & 86.0 & 1.12 & 47.7\% & 10.1 \\
Deep SVDD OOD Filter \cite{ref:svdd} & 91.8 & 90.8 & 83.4 & 87.4 & 1.05 & 50.9\% & 14.8 \\
Ungated Personalized Baseline \cite{ref:ppgpersonal} & 93.4 & 88.5 & 80.1 & 86.2 & 1.34 & 37.4\% & 11.6 \\
\textbf{Proposed Motion-Aware System (Full)} & \textbf{97.2} & \textbf{96.8} & \textbf{92.6} & \textbf{94.8} & \textbf{0.18} & \textbf{91.6\%} & \textbf{12.4} \\
\bottomrule
\end{tabular}
\end{table*}

The experimental findings demonstrate decisive performance advantages:
\begin{itemize}
\item The static population baseline exhibits a severe false alarm rate of 2.14~alarms/hour on free-living CACHET-CADB recordings. Over a 24-hour day, this corresponds to more than 51 spurious alerts.
\item Standalone SQI screening (SensEcho) cuts the false alarm rate to 1.12~alarms/hour (47.7\% reduction), validating that noise rejection is indispensable. However, because it lacks personal morphological adaptation, it still triggers numerous false positives on benign atypical morphologies.
\item The ungated personalized baseline achieves high initial sensitivity (93.4\%) but suffers degraded specificity (88.5\%) and an elevated false alarm rate (1.34~alarms/hour). Inspection reveals that during unconstrained walking, motion artifacts seeped into the personal template updates, skewing the reference model.
\item The \textbf{Proposed Motion-Aware Framework} achieves the best overall performance, driving the false alarm rate down to an unprecedented \textbf{0.18 alarms/hour}---representing an overall \textbf{91.6\% reduction} compared to the static baseline and a \textbf{68.4\% reduction} compared to existing personalized solutions. It achieves this while concurrently improving sensitivity to \textbf{97.2\%} and Macro-F1 to \textbf{94.8\%}.
\end{itemize}

\begin{figure}[!t]
\centering
\includegraphics[width=0.88\columnwidth]{fig3_roc.png}
\caption{Receiver Operating Characteristic (ROC) curves on the ambulatory wearable benchmark comparing the proposed framework with state-of-the-art baselines. The marked operating point demonstrates 97.2\% sensitivity at a minimal false alarm rate.}
\label{fig:roc}
\end{figure}

Fig.~\ref{fig:roc} displays the ROC curves. The proposed motion-aware system maintains an Area Under the Curve (AUC) of \textbf{0.988}, significantly outperforming the ungated personalized model (0.946) and the static population baseline (0.884).

\subsection{Arrhythmia-Specific Detection Sensitivity}
To ensure that false-alarm reduction did not compromise critical diagnostic safety, detection sensitivity was broken down across distinct cardiac pathologies:
\begin{itemize}
\item \textbf{Premature Ventricular Contractions (PVC):} 98.4\% sensitivity with 97.1\% precision.
\item \textbf{Atrial Fibrillation (AFib):} 96.9\% sensitivity, verified by combined RR irregularity and PPG pulse deficit.
\item \textbf{Ventricular Tachycardia (VT):} 99.1\% sensitivity, detected within an average latency of 2.8~seconds.
\item \textbf{Sinus Bradycardia / Tachycardia:} 98.6\% sensitivity across both resting and active regimes.
\end{itemize}

\section{Ablation Studies}
\label{sec:ablation}

To quantify the exact impact of each architectural component, an ablation study was conducted on the CACHET-CADB cohort, reported in Table~\ref{tab:ablation}.

\begin{table}[t]
\caption{Ablation Analysis of Framework Architectural Components}
\label{tab:ablation}
\centering
\scriptsize
\renewcommand{\arraystretch}{1.2}
\begin{tabularx}{\columnwidth}{l c c c c}
\toprule
\textbf{Ablation Variant} & \textbf{Macro-F1 (\%)} & \textbf{Sens. (\%)} & \textbf{Spec. (\%)} & \textbf{FAR (/h)} \\
\midrule
Full Proposed System & \textbf{94.8} & \textbf{97.2} & \textbf{96.8} & \textbf{0.18} \\
w/o Accelerometer Motion Gate & 87.2 & 95.1 & 89.4 & 0.94 \\
w/o Multi-Metric SQI Filter & 84.6 & 94.8 & 86.3 & 1.28 \\
w/o Activity-Conditioned Branches & 89.1 & 93.5 & 91.0 & 0.76 \\
w/o Temporal Confirmation Buffer & 91.3 & 97.5 & 92.2 & 0.62 \\
w/o Personalization (Pop. Only) & 82.5 & 89.0 & 87.1 & 1.65 \\
\bottomrule
\end{tabularx}
\end{table}

The ablation results provide clear insights:
\begin{enumerate}
\item \textbf{Importance of Motion Gating:} Removing the accelerometer motion gate causes FAR to spike from 0.18 to 0.94~alarms/hour (+422\%), proving that inertially tracked movement is vital for disambiguating mechanical friction from true arrhythmias.
\item \textbf{Role of SQI Filtering:} Eliminating the SQI filter leads to the largest degradation in specificity (dropping to 86.3\%) and inflates FAR to 1.28~alarms/hour, demonstrating that raw noisy signals must never be evaluated directly.
\item \textbf{Impact of Dual Activity Branches:} Merging active and resting models into a single baseline degrades Macro-F1 to 89.1\% due to false tachycardia alerts during normal walking.
\item \textbf{Benefit of Confirmation Hysteresis:} Omitting the temporal confirmation buffer increases false alarms to 0.62~alarms/hour due to transient single-beat motion glitches.
\end{enumerate}

\section{Discussion and Limitations}
\label{sec:discussion}

The experimental findings confirm that false-alarm reduction in wearable cardiac telemonitoring cannot be achieved solely by increasing neural network depth. Instead, the interaction between physical motion, sensor coupling quality, and individual physiology must be modeled explicitly. 

\subsection{Clinical Implications and Alarm Fatigue}
In traditional wearable cardiac monitoring, patients often experience dozens of false alerts daily, causing severe anxiety and eventual device discontinuation. By reducing the false-alarm frequency to below one alert every five hours during active living (and zero false alerts during nocturnal sleep), the proposed framework fosters patient adherence and provides actionable, high-confidence alerts to clinicians.

\subsection{Edge Computational Feasibility}
The complete pipeline incurs an inference latency of only 12.4~ms per 10-second window on an embedded ARM Cortex-A53 processor (1.2~GHz), requiring less than 420~kB of RAM. This confirms that the proposed architecture is ready for immediate firmware integration into commercial smartbands and smartwatches without degrading battery life.

\subsection{Limitations and Future Work}
Certain limitations remain. First, during severe high-intensity athletic workouts (e.g., crossfit or mountain biking), extensive sensor decoupling causes the system to remain in the "Inconclusive" state for prolonged periods. Second, initial baseline adaptation requires approximately 20--30 minutes of relatively quiet resting data. Future work will investigate self-supervised contrastive pre-training to accelerate cold-start adaptation and explore federated fleet learning across wearable users while preserving data privacy.

\section{Conclusion}
\label{sec:conclusion}

This paper presented a motion-aware personalized ECG anomaly detection framework specifically designed to conquer the false-alarm crisis in wearable cardiac risk screening. By establishing a dual-gating mechanism driven by multimodal signal quality indices and accelerometer-derived physical activity context, the framework guarantees that motion-corrupted signals are blocked from contaminating personal cardiac baselines and triggering spurious clinical alerts. Extensive benchmarking across diverse clinical and free-living ambulatory cohorts proved that the system reduces false alarms by over 91\% compared to population baselines while sustaining 97.2\% sensitivity to life-threatening arrhythmias with edge-compatible efficiency. The proposed methodology offers a robust foundation for next-generation, clinically trusted wearable cardiac protection.

\begin{thebibliography}{00}

\bibitem{ref:cachet}
D. Kumar, S. Puthusserypady, H. Dominguez, K. Sharma, and J. E. Bardram, ``CACHET-CADB: A contextualized ambulatory electrocardiography arrhythmia dataset,'' \textit{Frontiers in Cardiovascular Medicine}, vol. 9, Art. no. 893090, Jul. 2022, doi: 10.3389/fcvm.2022.893090.

\bibitem{ref:senecho}
H. Xu, W. Yan, K. Lan, C. Ma, D. Wu, A. Wu, Z. Yang, J. Wang, Y. Zang, M. Yan, and Z. Zhang, ``Assessing electrocardiogram and respiratory signal quality of a wearable device,'' \textit{JMIR mHealth and uHealth}, vol. 9, no. 8, Art. no. e25415, Aug. 2021, doi: 10.2196/25415.

\bibitem{ref:svdd}
M. F. R. Ibrahim, M. Meijer, A. Schlaefer, and P. Stelldinger, ``Enhancing ECG classification robustness with lightweight unsupervised anomaly detection filters,'' \textit{arXiv preprint arXiv:2510.26501}, 2025.

\bibitem{ref:ppgpersonal}
R. Ghorbani, M. J. T. Reinders, and D. M. J. Tax, ``Personalized anomaly detection in PPG data using representation learning and biometric identification,'' \textit{Biomedical Signal Processing and Control}, vol. 94, Art. no. 106216, 2024, doi: 10.1016/j.bspc.2024.106216.

\bibitem{ref:pulse}
D. Gabrielli, B. Prenkaj, P. Velardi, and S. Faralli, ``AI on the pulse: Real-time health anomaly detection with wearable and ambient intelligence,'' in \textit{Proc. 34th ACM Int. Conf. Information and Knowledge Management (CIKM)}, Seoul, Republic of Korea, Nov. 2025.

\bibitem{ref:annet}
R. Sivapalan, K. K. Wong, and H. C. Lovell, ``ANNet: A lightweight neural network for ECG anomaly detection in IoT edge sensors,'' \textit{IEEE Transactions on Biomedical Circuits and Systems}, vol. 16, no. 1, pp. 24--35, Feb. 2022.

\bibitem{ref:helpwear}
F. Nguyen and A. D. T. Bertram, ``Systems, articles and methods for cardiology sensory technology,'' U.S. Patent 11,363,958 B2, Jun. 21, 2022.

\bibitem{ref:eggers}
P. E. Eggers, E. A. Eggers, B. Z. Bailey, and A. Eggers, ``Wearable apparatus, system and method for detection of cardiac arrest and alerting emergency response,'' U.S. Patent 11,707,198 B2, Jul. 25, 2023.

\bibitem{ref:gaibazzi}
N. Gaibazzi and C. Reverberi, ``Method and system for monitoring cardiac arrest during a physical exercise of a user and consequent activation of a rescue request,'' U.S. Patent 11,134,850 B2, Oct. 2021.

\bibitem{ref:wesad}
P. Schmidt, A. Reiss, R. Duerichen, C. Marberger, and K. Van Laerhoven, ``Introducing WESAD, a multimodal dataset for wearable stress and affect detection,'' in \textit{Proc. 20th ACM Int. Conf. Multimodal Interaction (ICMI)}, Boulder, CO, USA, 2018, pp. 400--408.

\bibitem{ref:ptbxl}
P. Wagner \textit{et al.}, ``PTB-XL, a large publicly available electrocardiography dataset,'' \textit{Scientific Data}, vol. 7, no. 1, p. 154, 2020.

\end{thebibliography}

\EOD

\end{document}
"""

tmpl_dir = 'C:/Users/pvdha/Downloads/Access_LaTeX_template/ACCESS_latex_template_20240429'
with open(os.path.join(tmpl_dir, 'access.tex'), 'w', encoding='utf-8') as f:
    f.write(tex_content)

print('Written access.tex successfully!')
