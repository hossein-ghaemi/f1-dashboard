// src/components/YearSelector.jsx
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function YearSelector({ year, onChange }) {
  return (
    <div>
      <h2>Select Year</h2>

      <DatePicker
        selected={new Date(year, 0)}   // Jan 1 of selected year
        onChange={(date) => {
          const selectedYear = date.getFullYear();
          onChange(selectedYear);
        }}
        showYearPicker
        dateFormat="yyyy"
      />
    </div>
  );
}