
import uuid

import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer

from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.neighbors import KNeighborsClassifier

from sklearn.inspection import permutation_importance

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    confusion_matrix
)


# ==========================================
# TRAINED MODEL REGISTRY
# ==========================================

# Models are kept in backend memory for prediction.
# Restarting the backend clears this registry.

TRAINED_MODEL_REGISTRY = {}

MAX_STORED_TRAINING_SESSIONS = 10


# ==========================================
# CLASSIFICATION MODELS
# ==========================================

CLASSIFICATION_MODELS = {
    "Logistic Regression": LogisticRegression(max_iter=1000),

    "Decision Tree": DecisionTreeClassifier(
        random_state=42,
        max_depth=8
    ),

    "Random Forest": RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        n_jobs=1
    ),

    "K-Nearest Neighbors": KNeighborsClassifier(
        n_neighbors=3
    )
}


# ==========================================
# REGRESSION MODELS
# ==========================================

REGRESSION_MODELS = {
    "Linear Regression": LinearRegression(),

    "Decision Tree Regressor": DecisionTreeRegressor(
        random_state=42,
        max_depth=8
    ),

    "Random Forest Regressor": RandomForestRegressor(
        n_estimators=100,
        random_state=42,
        n_jobs=1
    )
}


# ==========================================
# CREATE PREDICTION INPUT SCHEMA
# ==========================================

def create_prediction_schema(X_train):

    schema = []

    for column in X_train.columns:

        series = X_train[column]

        if pd.api.types.is_numeric_dtype(series):

            default_value = series.median()

            if pd.isna(default_value):
                default_value = 0

            schema.append({
                "name": str(column),
                "type": "number",
                "default_value": float(default_value),
                "options": []
            })

        else:

            values = (
                series
                .dropna()
                .astype(str)
                .unique()
                .tolist()
            )

            options = values[:30]

            default_value = (
                series.mode(dropna=True).iloc[0]
                if not series.mode(dropna=True).empty
                else ""
            )

            schema.append({
                "name": str(column),
                "type": "categorical",
                "default_value": str(default_value),
                "options": options
            })

    return schema


# ==========================================
# MAIN MODEL TRAINING FUNCTION
# ==========================================

def train_models(
    df: pd.DataFrame,
    target_column: str,
    problem_type: str,
    dataset_id: str = None
):

    # ======================================
    # 1. DATA VALIDATION
    # ======================================

    if df.empty:
        raise ValueError("The selected dataset is empty.")

    if target_column not in df.columns:
        raise ValueError(
            "The selected target column does not exist."
        )

    if problem_type not in ["classification", "regression"]:
        raise ValueError(
            "Problem type must be classification or regression."
        )

    if len(df) < 12:
        raise ValueError(
            "At least 12 rows are required for this initial ML training version."
        )

    if len(df.columns) < 2:
        raise ValueError(
            "The dataset needs at least one feature column and one target column."
        )

    # ======================================
    # 2. REMOVE MISSING TARGET VALUES
    # ======================================

    data = df.copy()

    data = data.dropna(subset=[target_column])

    if len(data) < 12:
        raise ValueError(
            "Not enough rows remain after removing missing target values."
        )

    # ======================================
    # 3. SEPARATE FEATURES AND TARGET
    # ======================================

    X = data.drop(columns=[target_column])

    y = data[target_column]

    X = X.dropna(axis=1, how="all")

    if X.empty:
        raise ValueError(
            "No usable feature columns were found."
        )

    # ======================================
    # 4. IDENTIFY FEATURE TYPES
    # ======================================

    numeric_columns = X.select_dtypes(
        include=["number"]
    ).columns.tolist()

    categorical_columns = X.select_dtypes(
        include=["object", "category", "bool", "string"]
    ).columns.tolist()

    unsupported_columns = [
        column
        for column in X.columns
        if column not in numeric_columns + categorical_columns
    ]

    X = X.drop(columns=unsupported_columns)

    if X.empty:
        raise ValueError(
            "No supported numerical or categorical features found."
        )

    # ======================================
    # 5. CONTROL CATEGORICAL CARDINALITY
    # ======================================

    categorical_columns = [
        column
        for column in categorical_columns
        if X[column].nunique(dropna=True) <= 100
    ]

    usable_columns = numeric_columns + categorical_columns

    X = X[usable_columns]

    if X.empty:
        raise ValueError(
            "No usable features remain after preprocessing checks."
        )

    # ======================================
    # 6. PREPROCESSING PIPELINES
    # ======================================

    transformers = []

    if numeric_columns:

        numeric_pipeline = Pipeline([
            (
                "imputer",
                SimpleImputer(strategy="median")
            ),
            (
                "scaler",
                StandardScaler()
            )
        ])

        transformers.append(
            (
                "numeric",
                numeric_pipeline,
                numeric_columns
            )
        )

    if categorical_columns:

        categorical_pipeline = Pipeline([
            (
                "imputer",
                SimpleImputer(strategy="most_frequent")
            ),
            (
                "encoder",
                OneHotEncoder(handle_unknown="ignore")
            )
        ])

        transformers.append(
            (
                "categorical",
                categorical_pipeline,
                categorical_columns
            )
        )

    preprocessor = ColumnTransformer(
        transformers=transformers,
        remainder="drop"
    )

    # ======================================
    # 7. CLASSIFICATION / REGRESSION SPLIT
    # ======================================

    if problem_type == "classification":

        y = y.astype(str)

        class_counts = y.value_counts()

        if len(class_counts) < 2:
            raise ValueError(
                "Classification requires at least two target classes."
            )

        if class_counts.min() < 2:
            raise ValueError(
                "Every target class must contain at least two records."
            )

        if len(class_counts) > 20:
            raise ValueError(
                "This initial version supports up to 20 target classes."
            )

        test_count = max(
            int(np.ceil(len(y) * 0.25)),
            len(class_counts)
        )

        if test_count >= len(y):
            raise ValueError(
                "Not enough records for a reliable classification train/test split."
            )

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=test_count,
            random_state=42,
            stratify=y
        )

        class_labels = sorted(y.unique().tolist())

        models = CLASSIFICATION_MODELS

    else:

        if not pd.api.types.is_numeric_dtype(y):
            raise ValueError(
                "Regression requires a numerical target column."
            )

        y = pd.to_numeric(y, errors="coerce")

        valid_rows = y.notna()

        X = X.loc[valid_rows]
        y = y.loc[valid_rows]

        if len(y) < 12:
            raise ValueError(
                "Not enough valid numerical target values for regression."
            )

        if y.nunique() < 2:
            raise ValueError(
                "Regression requires at least two different target values."
            )

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.25,
            random_state=42
        )

        class_labels = []

        models = REGRESSION_MODELS

    # ======================================
    # 8. CREATE PREDICTION SESSION
    # ======================================

    training_id = str(uuid.uuid4())

    prediction_schema = create_prediction_schema(X_train)

    stored_models = {}

    # ======================================
    # 9. TRAIN AND EVALUATE MODELS
    # ======================================

    results = []

    for model_name, model in models.items():

        try:

            pipeline = Pipeline([
                ("preprocessor", preprocessor),
                ("model", model)
            ])

            pipeline.fit(X_train, y_train)

            predictions = pipeline.predict(X_test)

            # ==================================
            # CLASSIFICATION METRICS
            # ==================================

            if problem_type == "classification":

                matrix = confusion_matrix(
                    y_test,
                    predictions,
                    labels=class_labels
                )

                metrics = {

                    "accuracy": round(
                        accuracy_score(y_test, predictions), 4
                    ),

                    "precision": round(
                        precision_score(
                            y_test,
                            predictions,
                            average="weighted",
                            zero_division=0
                        ),
                        4
                    ),

                    "recall": round(
                        recall_score(
                            y_test,
                            predictions,
                            average="weighted",
                            zero_division=0
                        ),
                        4
                    ),

                    "f1_score": round(
                        f1_score(
                            y_test,
                            predictions,
                            average="weighted",
                            zero_division=0
                        ),
                        4
                    ),

                    "class_labels": class_labels,

                    "confusion_matrix": matrix.tolist()
                }

                score = metrics["f1_score"]

                importance_scoring = "f1_weighted"

            # ==================================
            # REGRESSION METRICS
            # ==================================

            else:

                rmse = float(
                    np.sqrt(
                        mean_squared_error(y_test, predictions)
                    )
                )

                metrics = {

                    "mae": round(
                        mean_absolute_error(y_test, predictions), 4
                    ),

                    "mse": round(
                        mean_squared_error(y_test, predictions), 4
                    ),

                    "rmse": round(rmse, 4),

                    "r2_score": round(
                        r2_score(y_test, predictions), 4
                    )
                }

                score = metrics["r2_score"]

                importance_scoring = "neg_mean_absolute_error"

            # ==================================
            # 10. PERMUTATION FEATURE IMPORTANCE
            # ==================================

            feature_importance = []
            feature_importance_error = None

            try:

                importance_result = permutation_importance(
                    pipeline,
                    X_test,
                    y_test,
                    n_repeats=5,
                    random_state=42,
                    scoring=importance_scoring,
                    n_jobs=1
                )

                for index, column in enumerate(X_test.columns):

                    feature_importance.append({

                        "feature": str(column),

                        "importance": round(
                            float(
                                importance_result.importances_mean[index]
                            ),
                            6
                        ),

                        "importance_std": round(
                            float(
                                importance_result.importances_std[index]
                            ),
                            6
                        )

                    })

                feature_importance.sort(
                    key=lambda item: item["importance"],
                    reverse=True
                )

            except Exception as importance_error:

                feature_importance_error = str(importance_error)

            # ==================================
            # 11. STORE TRAINED MODEL
            # ==================================

            stored_models[model_name] = pipeline

            # ==================================
            # 12. SAVE SUCCESSFUL RESULT
            # ==================================

            results.append({

                "model": model_name,

                "status": "success",

                "metrics": metrics,

                "comparison_score": score,

                "feature_importance": feature_importance,

                "feature_importance_error": feature_importance_error

            })

        except Exception as error:

            results.append({

                "model": model_name,

                "status": "failed",

                "error": str(error)

            })

    # ======================================
    # 13. FIND SUCCESSFUL MODELS
    # ======================================

    successful_results = [
        result
        for result in results
        if result["status"] == "success"
    ]

    if not successful_results:

        raise ValueError(
            "All models failed. Check your dataset and selected target column."
        )

    # ======================================
    # 14. SELECT BEST MODEL
    # ======================================

    successful_results.sort(
        key=lambda result: result["comparison_score"],
        reverse=True
    )

    best_model = successful_results[0]["model"]

    # ======================================
    # 15. SAVE SESSION FOR PREDICTION
    # ======================================

    TRAINED_MODEL_REGISTRY[training_id] = {

        "dataset_id": dataset_id,

        "problem_type": problem_type,

        "target_column": target_column,

        "feature_columns": usable_columns,

        "prediction_schema": prediction_schema,

        "class_labels": class_labels,

        "models": stored_models

    }

    # Keep only the latest sessions to control memory use.
    while len(TRAINED_MODEL_REGISTRY) > MAX_STORED_TRAINING_SESSIONS:

        oldest_training_id = next(iter(TRAINED_MODEL_REGISTRY))

        del TRAINED_MODEL_REGISTRY[oldest_training_id]

    # ======================================
    # 16. RETURN FINAL RESULTS
    # ======================================

    return {

        "training_id": training_id,

        "prediction_schema": prediction_schema,

        "problem_type": problem_type,

        "target_column": target_column,

        "total_rows": int(len(data)),

        "training_rows": int(len(X_train)),

        "testing_rows": int(len(X_test)),

        "feature_columns": usable_columns,

        "models_tested": len(results),

        "successful_models": len(successful_results),

        "failed_models": len(results) - len(successful_results),

        "best_model": best_model,

        "results": results,

        "evaluation_note": (
            "Metrics are calculated on a held-out test set. "
            "They are not a guarantee of future performance."
        )

    }


# ==========================================
# PREDICT USING A TRAINED MODEL
# ==========================================

def predict_trained_model(
    training_id: str,
    model_name: str,
    input_data: dict
):

    # ======================================
    # 1. FIND TRAINING SESSION
    # ======================================

    session = TRAINED_MODEL_REGISTRY.get(training_id)

    if session is None:
        raise ValueError(
            "Training session not found. Please train the models again."
        )

    # ======================================
    # 2. CHECK SELECTED MODEL
    # ======================================

    pipeline = session["models"].get(model_name)

    if pipeline is None:
        raise ValueError(
            "The selected model is not available in this training session."
        )

    # ======================================
    # 3. VALIDATE INPUT FEATURES
    # ======================================

    feature_columns = session["feature_columns"]

    if not isinstance(input_data, dict):
        raise ValueError(
            "Prediction input must be a valid object."
        )

    missing_columns = [
        column
        for column in feature_columns
        if column not in input_data
    ]

    if missing_columns:
        raise ValueError(
            "Missing input features: " + ", ".join(missing_columns)
        )

    schema_by_name = {
        item["name"]: item
        for item in session["prediction_schema"]
    }

    cleaned_input = {}

    for column in feature_columns:

        value = input_data[column]

        if value is None or (
            isinstance(value, str) and not value.strip()
        ):
            raise ValueError(
                f"Please enter a value for {column}."
            )

        field_type = schema_by_name[str(column)]["type"]

        if field_type == "number":

            try:
                cleaned_input[column] = float(value)

            except (TypeError, ValueError):
                raise ValueError(
                    f"{column} must contain a valid number."
                )

        else:

            cleaned_input[column] = str(value)

    # ======================================
    # 4. CREATE INPUT DATAFRAME
    # ======================================

    input_df = pd.DataFrame(
        [cleaned_input],
        columns=feature_columns
    )

    # ======================================
    # 5. GENERATE PREDICTION
    # ======================================

    prediction = pipeline.predict(input_df)[0]

    problem_type = session["problem_type"]

    result = {

        "training_id": training_id,

        "model": model_name,

        "problem_type": problem_type,

        "target_column": session["target_column"],

        "prediction": (
            float(prediction)
            if problem_type == "regression"
            else str(prediction)
        ),

        "confidence": None,

        "probabilities": []

    }

    # ======================================
    # 6. CLASSIFICATION PROBABILITIES
    # ======================================

    if (
        problem_type == "classification"
        and hasattr(pipeline, "predict_proba")
    ):

        probabilities = pipeline.predict_proba(input_df)[0]

        model_classes = pipeline.named_steps["model"].classes_

        probability_results = []

        for label, probability in zip(
            model_classes,
            probabilities
        ):

            probability_results.append({

                "class": str(label),

                "probability": round(
                    float(probability),
                    6
                )

            })

        probability_results.sort(
            key=lambda item: item["probability"],
            reverse=True
        )

        result["probabilities"] = probability_results

        if probability_results:

            result["confidence"] = round(
                probability_results[0]["probability"],
                6
            )

    return result
