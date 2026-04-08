package com.example.demo.util;

import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;

public final class CsvParserUtil {

    private CsvParserUtil() {
        // Utility class
    }

    /**
     * Parses a CSV file from a MultipartFile and returns all rows (including header).
     */
    public static List<String[]> parseCsv(MultipartFile file) throws IOException, CsvException {
        try (CSVReader reader = new CSVReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            return reader.readAll();
        }
    }

    /**
     * Parses a CSV and returns data rows only (skips the header row).
     */
    public static List<String[]> parseCsvSkipHeader(MultipartFile file) throws IOException, CsvException {
        List<String[]> allRows = parseCsv(file);
        if (allRows.isEmpty()) return allRows;
        return allRows.subList(1, allRows.size());
    }

    /**
     * Validates that the CSV header matches the expected columns.
     */
    public static boolean validateHeader(String[] header, String[] expectedColumns) {
        if (header.length < expectedColumns.length) return false;

        for (int i = 0; i < expectedColumns.length; i++) {
            if (!header[i].trim().equalsIgnoreCase(expectedColumns[i].trim())) {
                return false;
            }
        }
        return true;
    }

    /**
     * Safely gets a value from a CSV row by index, returns null if index is out of bounds.
     */
    public static String getSafe(String[] row, int index) {
        if (index < 0 || index >= row.length) return null;
        String value = row[index].trim();
        return value.isEmpty() ? null : value;
    }
}
