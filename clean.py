import json

def process_kpi_data(input_json: dict) -> list:
    output = []

    for item in input_json.get("data", []):
        output.append({
            "kpi_name": item.get("kpi_name"),
            "kpi_value": item.get("kpi_value"),
            "executed_at": item.get("executed_at"),
            "frequency": item.get("frequency")
        })

    return output


if __name__ == "__main__":
    with open("input.json", "r") as f:
        input_data = json.load(f)

    processed_data = process_kpi_data(input_data)

    with open("output.json", "w") as f:
        json.dump(processed_data, f, indent=4)

    print("✅ Processing completed:", len(processed_data), "records")
