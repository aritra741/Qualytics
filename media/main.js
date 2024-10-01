document.addEventListener("DOMContentLoaded", (event) => {
  console.log("DOM fully loaded and parsed");

  if (typeof metrics === "undefined") {
    console.error("Metrics data is not available.");
    return;
  }

  console.log("Metrics data:", JSON.stringify(metrics, null, 2));

  const files = Object.keys(metrics);
  const cyclomaticComplexities = Object.values(metrics).map((m) =>
    isFinite(m.cyclomaticComplexity) ? m.cyclomaticComplexity : 0
  );
  const maintainabilityIndices = Object.values(metrics).map((m) =>
    isFinite(m.maintainabilityIndex) ? m.maintainabilityIndex : 0
  );
  const linesOfCode = Object.values(metrics).map((m) =>
    isFinite(m.linesOfCode) ? m.linesOfCode : 0
  );

  function shortenPath(filePath) {
    const parts = filePath.split(/[\\/]/);
    return parts.length > 2 ? ".../" + parts.slice(-2).join("/") : filePath;
  }

  const commonOptions = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: true,
        intersect: false,
        mode: "index",
      },
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 90,
          minRotation: 90,
        },
      },
    },
  };

  // Cyclomatic Complexity Chart
  new Chart(document.getElementById("cyclomatic-complexity-chart"), {
    type: "bar",
    data: {
      labels: files.map(shortenPath),
      datasets: [
        {
          label: "Cyclomatic Complexity",
          data: cyclomaticComplexities,
          backgroundColor: "rgba(75, 192, 192, 0.6)",
        },
      ],
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: {
          display: true,
          text: "Cyclomatic Complexity by File",
        },
        tooltip: {
          ...commonOptions.plugins.tooltip,
          callbacks: {
            title: (context) => files[context[0].dataIndex],
            label: (context) => `Complexity: ${context.parsed.y}`,
          },
        },
      },
      scales: {
        ...commonOptions.scales,
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Complexity",
          },
        },
      },
    },
  });

  // Maintainability Index Chart
  new Chart(document.getElementById("maintainability-index-chart"), {
    type: "bar",
    data: {
      labels: files.map(shortenPath),
      datasets: [
        {
          label: "Maintainability Index",
          data: maintainabilityIndices,
          backgroundColor: "rgba(255, 159, 64, 0.6)",
        },
      ],
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: {
          display: true,
          text: "Maintainability Index by File",
        },
        tooltip: {
          ...commonOptions.plugins.tooltip,
          callbacks: {
            title: (context) => files[context[0].dataIndex],
            label: (context) =>
              `Maintainability Index: ${context.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        ...commonOptions.scales,
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Maintainability Index",
          },
        },
      },
    },
  });

  // Lines of Code vs Complexity Scatter Plot
  new Chart(document.getElementById("loc-vs-complexity-chart"), {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Files",
          data: files.map((file, index) => ({
            x: linesOfCode[index],
            y: cyclomaticComplexities[index],
          })),
          backgroundColor: "rgba(54, 162, 235, 0.6)",
        },
      ],
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: {
          display: true,
          text: "Lines of Code vs Cyclomatic Complexity",
        },
        tooltip: {
          ...commonOptions.plugins.tooltip,
          callbacks: {
            label: (context) => {
              const index = context.dataIndex;
              return `${files[index]}: (LOC: ${linesOfCode[index]}, Complexity: ${cyclomaticComplexities[index]})`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Lines of Code",
          },
        },
        y: {
          title: {
            display: true,
            text: "Cyclomatic Complexity",
          },
        },
      },
    },
  });

  // Create summary table
  const summaryDiv = document.getElementById("metrics-summary");
  const summaryTable = document.createElement("table");
  summaryTable.innerHTML = `
        <tr>
            <th>Metric</th>
            <th>Average</th>
            <th>Min</th>
            <th>Max</th>
        </tr>
        ${["cyclomaticComplexity", "maintainabilityIndex", "linesOfCode"]
          .map(
            (metric) => `
            <tr>
                <td>${metric}</td>
                <td>${average(
                  Object.values(metrics).map((m) => m[metric])
                ).toFixed(2)}</td>
                <td>${Math.min(
                  ...Object.values(metrics).map((m) => m[metric])
                ).toFixed(2)}</td>
                <td>${Math.max(
                  ...Object.values(metrics).map((m) => m[metric])
                ).toFixed(2)}</td>
            </tr>
        `
          )
          .join("")}
    `;
  summaryDiv.appendChild(summaryTable);

  function average(arr) {
    const validNumbers = arr.filter((num) => isFinite(num));
    return validNumbers.length > 0
      ? validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length
      : 0;
  }
});
