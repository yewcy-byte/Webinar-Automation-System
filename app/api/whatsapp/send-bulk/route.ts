import { whatsappService } from "@/lib/whatsapp";
import * as XLSX from "xlsx";

interface ExcelRow {
  [key: string]: string | number | undefined;
}

/**
 * Auto-detect phone and name columns from Excel headers
 */
function detectColumns(headers: string[]): {
  phoneColumn: string | null;
  nameColumn: string | null;
} {
  const phonePatterns = ["phone", "whatsapp", "mobile", "number", "contact"];
  const namePatterns = ["name", "fullname", "first name", "recipient"];

  const phoneColumn = headers.find((h) =>
    phonePatterns.some((p) =>
      h.toLowerCase().includes(p.toLowerCase())
    )
  ) || null;

  const nameColumn = headers.find((h) =>
    namePatterns.some((p) =>
      h.toLowerCase().includes(p.toLowerCase())
    )
  ) || null;

  return { phoneColumn, nameColumn };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const messageTemplate = formData.get("message") as string;
    const webinarLink = formData.get("webinarLink") as string;

    if (!file) {
      return Response.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!messageTemplate) {
      return Response.json(
        { error: "No message template provided" },
        { status: 400 }
      );
    }

    // Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

    if (rows.length === 0) {
      return Response.json(
        { error: "Excel file is empty" },
        { status: 400 }
      );
    }

    // Detect columns
    const headers = Object.keys(rows[0]);
    const { phoneColumn, nameColumn } = detectColumns(headers);

    if (!phoneColumn) {
      return Response.json(
        {
          error: `Could not detect phone column. Available columns: ${headers.join(", ")}. 
          Please rename your phone column to include one of: phone, whatsapp, mobile, number, contact`,
        },
        { status: 400 }
      );
    }

    // Extract recipients
    const recipients = rows
      .map((row) => {
        const phone = row[phoneColumn]?.toString().trim();
        const name = nameColumn ? row[nameColumn]?.toString().trim() : "User";

        return phone
          ? {
              phone,
              name: name || "User",
            }
          : null;
      })
      .filter((r) => r !== null) as Array<{ phone: string; name: string }>;

    if (recipients.length === 0) {
      return Response.json(
        { error: "No valid phone numbers found in the Excel file" },
        { status: 400 }
      );
    }

    // Prepare the message
    let finalMessage = messageTemplate;

    // Replace placeholders
    if (webinarLink) {
      finalMessage = finalMessage.replace(/{webinar_link}/g, webinarLink);
    }

    // Send bulk messages
    const result = await whatsappService.sendBulkMessages(
      recipients,
      finalMessage
    );

    return Response.json({
      success: true,
      message: `Messages sent successfully`,
      totalRecipients: recipients.length,
      successful: result.successful,
      failed: result.failed,
      errors: result.errors,
      detectedColumns: {
        phoneColumn,
        nameColumn,
      },
    });
  } catch (error) {
    console.error("Error processing bulk messages:", error);
    return Response.json(
      {
        error: `Failed to process request: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}
