import { ParsedExpenseData } from './index'
import { columnLetterToIndex, parseDate, parseAmount, cleanText, generateRowHash } from './parserUtils'

/**
 * Parse transport expense data from Google Sheets
 * Expected columns: Date, Vehicle, Amount, Distance, Fuel_Type, Driver, Route
 */
export function parseTransportData(
  rawData: string[][],
  columnMapping: Record<string, string>
): ParsedExpenseData[] {
  if (!rawData || rawData.length === 0) {
    return []
  }

  const results: ParsedExpenseData[] = []

  // Convert column letters to indices
  const columnIndices: Record<string, number> = {}
  Object.entries(columnMapping).forEach(([field, column]) => {
    columnIndices[field] = columnLetterToIndex(column as string)
  })

  rawData.forEach((row, rowIndex) => {
    try {
      // Skip empty rows
      if (!row || row.every(cell => !cell || cell.trim() === '')) {
        return
      }

      const parsedRow: ParsedExpenseData = {
        date: '',
        amount: 0,
        description: '',
        category: 'transport'
      }

      let distance = 0
      let fuelType = ''
      let route = ''
      let driver = ''

      // Map columns to fields
      Object.entries(columnIndices).forEach(([field, colIndex]) => {
        const cellValue = row[colIndex]?.toString().trim() || ''
        
        switch (field) {
          case 'date':
            parsedRow.date = parseDate(cellValue)
            break
          case 'amount':
            parsedRow.amount = parseAmount(cellValue)
            break
          case 'vehicle':
            parsedRow.vehicle = cellValue
            parsedRow.description = `Transport: ${cellValue}`
            break
          case 'distance':
            distance = parseFloat(cellValue) || 0
            break
          case 'fuel_type':
            fuelType = cellValue
            break
          case 'driver':
            driver = cellValue
            parsedRow.employee = cellValue
            break
          case 'route':
            route = cellValue
            break
          case 'description':
            // Override default description if provided
            if (cellValue) {
              parsedRow.description = cellValue
            }
            break
          case 'type':
            parsedRow.type = cellValue
            break
        }
      })

      // Build comprehensive description
      if (route) {
        parsedRow.description = `${parsedRow.description} - Route: ${route}`
      }
      if (distance > 0) {
        parsedRow.description = `${parsedRow.description} (${distance}km)`
      }

      // Validate required fields for transport
      if (parsedRow.date && parsedRow.amount > 0 && parsedRow.vehicle) {
        // Add transport-specific metadata
        parsedRow.metadata = {
          transport_type: determineTransportType(parsedRow.vehicle, fuelType),
          distance_km: distance,
          fuel_type: fuelType,
          driver: driver,
          route: route,
          cost_per_km: distance > 0 ? (parsedRow.amount / distance).toFixed(2) : null,
          processed_at: new Date().toISOString(),
          rowNumber: rowIndex + 1,
          originalRow: row,
          rowHash: generateRowHash(row)
        }
        
        results.push(parsedRow)
      }
    } catch (error) {
      console.warn(`Error parsing transport row ${rowIndex + 1}:`, error)
    }
  })

  return results
}

/**
 * Determine transport type based on vehicle and fuel information
 */
function determineTransportType(vehicle: string, fuelType: string): string {
  const vehicleLower = vehicle.toLowerCase()
  const fuelLower = fuelType.toLowerCase()
  
  if (vehicleLower.includes('автобус') || vehicleLower.includes('bus')) return 'bus'
  if (vehicleLower.includes('грузовик') || vehicleLower.includes('truck')) return 'truck'
  if (vehicleLower.includes('мотоцикл') || vehicleLower.includes('motorcycle')) return 'motorcycle'
  if (vehicleLower.includes('велосипед') || vehicleLower.includes('bike')) return 'bicycle'
  if (fuelLower.includes('дизель') || fuelLower.includes('diesel')) return 'diesel_vehicle'
  if (fuelLower.includes('бензин') || fuelLower.includes('gasoline')) return 'gasoline_vehicle'
  if (fuelLower.includes('электр') || fuelLower.includes('electric')) return 'electric_vehicle'
  
  return 'passenger_car'
}