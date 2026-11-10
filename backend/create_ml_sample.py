
import numpy as np
import pandas as pd
from pathlib import Path

# Reproducible sample data
rng = np.random.default_rng(42)

records = 120

age = rng.integers(18, 65, records)
monthly_spend = rng.integers(500, 10001, records)
visits = rng.integers(1, 16, records)
support_tickets = rng.integers(0, 8, records)

membership = rng.choice(
    ["Basic", "Silver", "Gold"],
    size=records,
    p=[0.45, 0.35, 0.20]
)

# Create a realistic synthetic churn pattern.
risk_score = (
    0.35
    + support_tickets * 0.09
    - visits * 0.035
    - (monthly_spend / 10000) * 0.10
    - np.where(membership == "Gold", 0.12, 0)
)

probability = np.clip(risk_score, 0.05, 0.90)

churn = rng.binomial(1, probability)

df = pd.DataFrame({
    "Age": age,
    "MonthlySpend": monthly_spend,
    "VisitsPerMonth": visits,
    "SupportTickets": support_tickets,
    "Membership": membership,
    "Churn": churn
})

# Save the CSV in the project's datasets folder.
output_folder = Path(__file__).resolve().parent.parent / "datasets"
output_folder.mkdir(parents=True, exist_ok=True)

output_path = output_folder / "customer_churn_ml.csv"

df.to_csv(output_path, index=False)

print("CUSTOMER CHURN DATASET CREATED SUCCESSFULLY!")
print("File:", output_path)
print("Total records:", len(df))
print("Total columns:", len(df.columns))
print("\nChurn distribution:")
print(df["Churn"].value_counts())
print("\nDataset preview:")
print(df.head())
